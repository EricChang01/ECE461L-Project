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
    # if not checkHardwareAvail(hardware_set, amount):
    #     return False

    result = hws_col.update_one(
        {'name': hardware_set, 'avail': {'$gte': amount}}, 
        {'$inc': {'avail': -amount}}
    )
    if result.modified_count != 1:
        return -1

    result = checkout_col.update_one(
        {'project': projectID, 'hw_name':hardware_set}, 
        {'$inc':{'amount': amount}},
        upsert=True
    )
    # if checkout_col.count_documents({'email':email, 'hw_name':hardware_set}) > 0:
    # else:
    #     checkout_col.insert_one({'email':email, 'hw_name':hardware_set, 'amount':amount})
    return 0

def checkAssignedHardwares(projectID, hardware_set, amount):
    result = checkout_col.count_documents(
        {'project':projectID, 'hw_name':hardware_set, 'amount': {'$gte': amount}})
    return result > 0  

def checkInHardwares(projectID, hardware_set, amount):
    # if not checkAssignedHardwares(email, hardware_set, amount):
    #     return False

    result = checkout_col.update_one(
        {'project':projectID, 'hw_name':hardware_set, 'amount': {'$gte': amount}}, 
        {'$inc': {'amount': -amount}}
    )
    if result.modified_count != 1:
        return -1

    result = hws_col.update_one({'name': hardware_set}, {'$inc': {'avail': amount}})
    if result.modified_count != 1:
        return -1

    checkout_col.delete_one({'amount': {'$lte': 0}})
    return 0

def createProject(name, des, projectID):
    if proj_col.find_one({"_id": projectID}):
        return -1  # Non-unique ID
    proj_col.insert_one({"_id": projectID, "name": name, "des": des, "users": []})
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
    assert createProject(test_project_name, test_project_desc, test_project_id) == 0, "Project creation failed"

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


db_init()

if __name__ == "__main__":
    db_test()
