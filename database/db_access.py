from pymongo import MongoClient

def db_init():
    uri = "mongodb+srv://ece461lab.rm3iy.mongodb.net/?authSource=%24external&authMechanism=MONGODB-X509&retryWrites=true&w=majority&appName=ECE461Lab"
    client = MongoClient(uri,
                         tls=True,
                         tlsCertificateKeyFile='../database/X509-cert-4851382559130201289.pem')

    global project_db 
    project_db = client['project_db']
    global user_col, proj_col, hws_col, checkout_col
    user_col = project_db['Users']
    proj_col = project_db['Projects']
    hws_col = project_db['HwSets']
    checkout_col = project_db['HwInUse']



def checkEmailExist(email):
    # result = user_col.find({'email': email})
    # result = [x for x in result]
    # return result
    # return user_col.count_documents({'email': email})
    return 0 < user_col.count_documents({"email": email})


def addUser(username, email, hashed_password):
    if user_col.find_one({ "$or": [{"username": username}, {"email": email}]}):
        return -1

    user_col.insert_one({
        "username": username,
        "email": email,
        "pwd": hashed_password,
    })
    return 0

def getUserHashedPassword(email):
    # count = user_col.count_documents({'email': email})
    # if count != 1:
    #     return None
    user = user_col.find_one({'email': email}, {"pwd": 1})

    if user:
        return user["pwd"]
    return None

def getAvailHardwares():
    all_hw = hws_col.find({}, {"name": 1, "avail": 1})
    # result = {}
    # for x in all_hw:
    #     result[x["name"]] = x["avail"]
    return {hw["name"]: hw["avail"] for hw in all_hw}

def checkHardwareAvail(hardware_set, amount):
    result = hws_col.count_documents({'name': hardware_set, 'avail': {'$gte': amount}})
    return result > 0

def checkoutHardwares(projectID, hardware_set, amount):
    """Check out hardware resources for a project"""
    try:
        print(f"CheckoutHardwares called: Project {projectID}, Hardware {hardware_set}, Amount {amount}")
        
        # Input validation
        if amount <= 0:
            print(f"Invalid amount: {amount}")
            return -1
        
        # Convert projectID to the right type if needed (int or string)
        # This handles the case where projectID might be passed as a string but stored as int
        try:
            numeric_project_id = int(projectID)
            # Check if project exists with numeric ID
            project = proj_col.find_one({"_id": numeric_project_id})
            if project:
                projectID = numeric_project_id
        except ValueError:
            # If conversion fails, use as is (it's already a string)
            pass
            
        # Check if project exists
        project = proj_col.find_one({"_id": projectID})
        if not project:
            print(f"Project {projectID} not found")
            return -2
            
        # Check if hardware set exists
        hw_set = hws_col.find_one({"name": hardware_set})
        if not hw_set:
            print(f"Hardware set {hardware_set} not found")
            return -3
            
        # Check availability
        if hw_set["avail"] < amount:
            print(f"Not enough hardware available. Requested: {amount}, Available: {hw_set['avail']}")
            return -4

        # Update hardware availability
        result = hws_col.update_one(
            {'name': hardware_set, 'avail': {'$gte': amount}}, 
            {'$inc': {'avail': -amount}}
        )
        print(f"Update hardware result: {result.modified_count}")
        
        if result.modified_count != 1:
            print(f"Failed to update hardware set")
            return -5

        # Update project's checked out hardware
        result = checkout_col.update_one(
            {'project': projectID, 'hw_name': hardware_set}, 
            {'$inc': {'amount': amount}},
            upsert=True
        )
        print(f"Update checkout result: {result.modified_count}, upserted_id: {result.upserted_id}")
        
        if result.modified_count != 1 and result.upserted_id is None:
            print(f"Failed to update checkout record")
            # Try to revert hardware availability change
            hws_col.update_one(
                {'name': hardware_set},
                {'$inc': {'avail': amount}}
            )
            return -6
        
        print(f"Successfully checked out {amount} units of {hardware_set} for project {projectID}")
        return 0
        
    except Exception as e:
        print(f"Error in checkoutHardwares: {e}")
        import traceback
        traceback.print_exc()
        return -99

def checkAssignedHardwares(projectID, hardware_set, amount):
    result = checkout_col.count_documents(
        {'project':projectID, 'hw_name':hardware_set, 'amount': {'$gte': amount}})
    return result > 0  

def checkInHardwares(projectID, hardware_set, amount):
    """Check in hardware resources for a project"""
    try:
        print(f"CheckInHardwares called: Project {projectID}, Hardware {hardware_set}, Amount {amount}")
        
        # Input validation
        if amount <= 0:
            print(f"Invalid amount: {amount}")
            return -1
        
        # Convert projectID to the right type if needed (int or string)
        # This handles the case where projectID might be passed as a string but stored as int
        try:
            numeric_project_id = int(projectID)
            # Check first with the numeric version
            checkout = checkout_col.find_one({'project': numeric_project_id, 'hw_name': hardware_set})
            if checkout:
                projectID = numeric_project_id
        except ValueError:
            # If conversion fails, use as is (it's already a string)
            pass
            
        print(f"Looking for project: {projectID}, type: {type(projectID)}")
        
        # Check if the project has actually checked out this hardware
        checkout_record = checkout_col.find_one({'project': projectID, 'hw_name': hardware_set})
        if not checkout_record:
            print(f"Project {projectID} has not checked out any {hardware_set}")
            return -2
            
        # Check if project has enough hardware to check in
        if checkout_record["amount"] < amount:
            print(f"Project {projectID} only has {checkout_record['amount']} units of {hardware_set}, cannot check in {amount}")
            return -3

        # Update checked out hardware
        result = checkout_col.update_one(
            {'project': projectID, 'hw_name': hardware_set, 'amount': {'$gte': amount}}, 
            {'$inc': {'amount': -amount}}
        )
        print(f"Update checkout result: {result.modified_count}")
        
        if result.modified_count != 1:
            print(f"Failed to update checkout record")
            return -4

        # Update hardware availability
        result = hws_col.update_one(
            {'name': hardware_set}, 
            {'$inc': {'avail': amount}}
        )
        print(f"Update hardware result: {result.modified_count}")
        
        if result.modified_count != 1:
            print(f"Failed to update hardware set")
            # Unfortunately, we already updated the checkout record, and lack of transaction
            # means we have inconsistent state. Try to revert:
            checkout_col.update_one(
                {'project': projectID, 'hw_name': hardware_set},
                {'$inc': {'amount': amount}}
            )
            return -5

        # Clean up zero-amount checkouts
        checkout_col.delete_many({'amount': {'$lte': 0}})
        
        print(f"Successfully checked in {amount} units of {hardware_set} for project {projectID}")
        return 0
        
    except Exception as e:
        print(f"Error in checkInHardwares: {e}")
        import traceback
        traceback.print_exc()
        return -99

def createProject(name, des, projectID, creator_email):
    if proj_col.find_one({"_id": projectID}):
        return -1  # Non-unique ID
    
    # Store projectID as string
    proj_col.insert_one({
        "_id": projectID, 
        "name": name, 
        "des": des, 
        "users": [creator_email]
    })
    return 0

def getProject(email, projectID):
    project = proj_col.find_one({"_id": projectID})
    if not project:
        return None  # Project not found
    
    if email not in project["users"]:
        proj_col.update_one({"_id": projectID}, {"$push": {"users": email}})
        project["users"].append(email)
    
    project["hwInUse"] = list(checkout_col.find({"project": projectID}, {"hw_name": 1, "amount": 1, "_id": 0}))
    return project

def getUserProjects(email):
    """Get all projects for a user"""
    projects = proj_col.find({"users": email})
    result = []
    
    for project in projects:
        project_id = project["_id"]
        
        # Get username information for each user in the project
        users_with_names = []
        for user_email in project["users"]:
            user_info = user_col.find_one({"email": user_email}, {"username": 1})
            if user_info and "username" in user_info:
                users_with_names.append({
                    "email": user_email,
                    "username": user_info["username"]
                })
            else:
                users_with_names.append({
                    "email": user_email,
                    "username": user_email  # Fallback to email if username not found
                })
        
        project_data = {
            "projectID": project_id,
            "name": project["name"],
            "des": project["des"],
            "users": users_with_names,
            "hardware": list(checkout_col.find({"project": project_id}, {"hw_name": 1, "amount": 1, "_id": 0}))
        }
        result.append(project_data)
    
    return result

def joinProject(email, projectID):
    """Join an existing project"""
    # Try to find the project with the exact ID
    project = proj_col.find_one({"_id": projectID})
    
    # If not found and ID is a string of digits, try numeric version
    if not project and isinstance(projectID, str) and projectID.isdigit():
        project = proj_col.find_one({"_id": int(projectID)})
    
    # If not found and ID is a number, try string version
    if not project and isinstance(projectID, int):
        project = proj_col.find_one({"_id": str(projectID)})
        
    if not project:
        return -1  # Project not found
    
    # Get the actual ID as stored in the database
    actual_id = project["_id"]
    
    if email in project["users"]:
        return 0  # User already in project
    
    proj_col.update_one({"_id": actual_id}, {"$push": {"users": email}})
    return 0  # Success

def db_test():
    # db_init()
    # doc_count = user_col.count_documents({})
    # print(doc_count)

    # user_col.delete_many({'username': 'foobar'})

    # result = user_col.find({'username': 'foobar'})#find({'email': { "$regex" : "fakegmail.com" }})
    # for i in result:
    #     print(i)

    # user_col.insert_one({'username': 'foobar', 'email': 'fbar@gmail.com', 'name': 'Foo Bar', 'pwd': 'hash2'})

    # result = user_col.find({'username': 'foobar'})#find({'email': { "$regex" : "fakegmail.com" }})
    # for i in result:
    #     print(i)

    # print(checkEmailExist('fbar@gmail.com'))
    # addUser('foobar', 'fbar@gmail.com', 'hash')
    # addUser('foobar2', 'fbar2@gmail.com', 'hash2')
    # print(checkEmailExist('fbar@gmail.com'))
    # print(getUserHashedPassword('fbar2@gmail.com'))

    # print(getAvailHardwares())
    # # print(checkoutHardwares('fbar@gmail.com', 'hw1', 15))
    # print(checkInHardwares('fbar@gmail.com', 'hw1', 5))

    print("Initializing database...")
    # db_init()

    # Test User Creation
    test_email = "testuser@example.com"
    test_username = "testuser"
    test_password = "securepassword"

    print("Testing user creation...")
    assert addUser(test_username, test_email, test_password) == 0, "User creation failed"
    assert checkEmailExist(test_email), "Email existence check failed"
    assert getUserHashedPassword(test_email) == test_password, "Password retrieval failed"
    
    input("User created. Check the database and press Enter to continue...")

    # Test Project Creation
    test_project_id = 1001
    test_project_name = "Test Project"
    test_project_desc = "A test project"

    print("Testing project creation...")
    assert createProject(test_project_name, test_project_desc, test_project_id, test_email) == 0, "Project creation failed"

    input("Project created. Check the database and press Enter to continue...")

    # Test Project Access & Joining
    print("Testing project retrieval & user joining...")
    project = getProject(test_email, test_project_id)
    assert project is not None, "Project retrieval failed"
    print(project)
    assert test_email in project["users"], "User was not added to the project"

    input("User joined project. Check the database and press Enter to continue...")

    # Test Hardware Setup
    test_hw_name = "Test Hardware"
    test_hw_capacity = 10
    test_hw_avail = 10

    print("Adding test hardware set...")
    hws_col.insert_one({"name": test_hw_name, "capacity": test_hw_capacity, "avail": test_hw_avail})

    input("Hardware set added. Check the database and press Enter to continue...")

    print("Testing available hardware retrieval...")
    available_hardware = getAvailHardwares()
    print(available_hardware)
    assert test_hw_name in available_hardware, "Hardware listing failed"
    assert available_hardware[test_hw_name] == test_hw_avail, "Hardware availability mismatch"

    # Test Hardware Checkout
    print("Testing hardware checkout...")
    checkout_amount = 5
    assert checkoutHardwares(test_project_id, test_hw_name, checkout_amount) == 0, "Hardware checkout failed"

    input("Hardware checked out. Check the database and press Enter to continue...")

    updated_hardware = getAvailHardwares()
    assert updated_hardware[test_hw_name] == (test_hw_avail - checkout_amount), "Hardware checkout did not update availability"

    # Test Hardware Check-In
    print("Testing hardware check-in...")
    assert checkInHardwares(test_project_id, test_hw_name, checkout_amount) == 0, "Hardware check-in failed"

    input("Hardware checked in. Check the database and press Enter to continue...")

    final_hardware = getAvailHardwares()
    assert final_hardware[test_hw_name] == test_hw_avail, "Hardware check-in did not update availability"

    # Cleanup Test Data
    print("Cleaning up test data...")
    user_col.delete_one({"email": test_email})
    proj_col.delete_one({"_id": test_project_id})
    hws_col.delete_one({"name": test_hw_name})
    checkout_col.delete_many({"project": test_project_id})

    input("Cleanup done. Check the database and press Enter to finish...")

    print("All tests passed successfully!")

def getUserInfo(email):
    """Get user information by email"""
    user = user_col.find_one({"email": email}, {"username": 1, "email": 1, "_id": 0})
    return user

def checkProjectIDExists(project_id):
    """Check if a project ID already exists
    
    Args:
        project_id: The project ID to check
        
    Returns:
        bool: True if the project ID exists, False otherwise
    """
    # Try both string and number versions of the ID
    if isinstance(project_id, str) and project_id.isdigit():
        # If it's a string of digits, also check the integer version
        numeric_id = int(project_id)
        return (proj_col.count_documents({"_id": project_id}) > 0 or 
                proj_col.count_documents({"_id": numeric_id}) > 0)
    elif isinstance(project_id, int):
        # If it's an integer, also check the string version
        string_id = str(project_id)
        return (proj_col.count_documents({"_id": project_id}) > 0 or 
                proj_col.count_documents({"_id": string_id}) > 0)
    else:
        # For non-numeric strings, just check as is
        return proj_col.count_documents({"_id": project_id}) > 0

def getProjectDirectly(projectID):
    """
    Get a project by ID without adding the user to it
    
    Args:
        projectID (str/int): ID of the project
        
    Returns:
        dict: Project document or None if not found
    """
    # Try to find the project with the exact ID
    project = proj_col.find_one({"_id": projectID})
    
    # If not found and ID is a string of digits, try numeric version
    if not project and isinstance(projectID, str) and projectID.isdigit():
        project = proj_col.find_one({"_id": int(projectID)})
    
    # If not found and ID is a number, try string version
    if not project and isinstance(projectID, int):
        project = proj_col.find_one({"_id": str(projectID)})
        
    return project

def removeUserFromProject(email, projectID):
    """
    Remove a user from a project
    
    Args:
        email (str): Email of the user
        projectID (str/int): ID of the project
        
    Returns:
        int: 0 if successful, non-zero otherwise
    """
    try:
        # Find the project
        project = getProjectDirectly(projectID)
        if not project:
            return -1  # Project not found
        
        # Get the actual ID as stored in the database
        actual_id = project["_id"]
        
        # Remove the user from the project
        result = proj_col.update_one(
            {"_id": actual_id},
            {"$pull": {"users": email}}
        )
        
        if result.modified_count != 1:
            return -1  # User not found in project or update failed
        
        return 0  # Success
    except Exception as e:
        print(f"Error removing user from project: {e}")
        return -1

def deleteProject(projectID):
    """
    Delete a project completely
    
    Args:
        projectID (str/int): ID of the project
        
    Returns:
        int: 0 if successful, non-zero otherwise
    """
    try:
        # Find the project to get the actual ID
        project = getProjectDirectly(projectID)
        if not project:
            return -1  # Project not found
        
        # Get the actual ID as stored in the database
        actual_id = project["_id"]
        
        # Delete the project
        result = proj_col.delete_one({"_id": actual_id})
        
        if result.deleted_count != 1:
            return -1  # Project not found or delete failed
        
        return 0  # Success
    except Exception as e:
        print(f"Error deleting project: {e}")
        return -1

def releaseAllProjectHardware(projectID):
    """
    Release all hardware resources associated with a project
    
    Args:
        projectID (str/int): ID of the project
        
    Returns:
        int: 0 if successful, non-zero otherwise
    """
    try:
        # Find all hardware assigned to this project
        hardware_items = checkout_col.find({"project": projectID})
        
        # For each hardware item, return it to the available pool
        for item in hardware_items:
            hw_name = item["hw_name"]
            amount = item["amount"]
            
            # Increase the available count for this hardware
            hws_col.update_one(
                {"name": hw_name},
                {"$inc": {"avail": amount}}
            )
        
        # Delete all checkout records for this project
        checkout_col.delete_many({"project": projectID})
        
        return 0  # Success
    except Exception as e:
        print(f"Error releasing project hardware: {e}")
        return -1

def getCheckedOutHW(projectID):
    all_hw = checkout_col.find({"project": projectID}, {"_id":0, "project":0})
    return [hw for hw in all_hw]

def getAllHardwareInfo():
    """Get complete hardware information including availability and capacity"""
    all_hw = list(hws_col.find({}, {"name": 1, "avail": 1, "capacity": 1, "_id": 0}))
    return all_hw

db_init()

if __name__ == "__main__":
    db_test()
