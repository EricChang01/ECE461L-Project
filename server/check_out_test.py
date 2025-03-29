from pymongo import MongoClient
import certifi
import os
from bson import ObjectId

# Path to your X.509 certificate file
cert_path = "../HW5/X509-cert-4851382559130201289.pem"

# Make sure the certificate file exists
if not os.path.exists(cert_path):
    raise FileNotFoundError(f"Certificate file not found at {cert_path}")

# URI from your file
uri = "mongodb+srv://ece461lab.rm3iy.mongodb.net/?authSource=%24external&authMechanism=MONGODB-X509&retryWrites=true&w=majority&appName=ECE461Lab"

def checkout_hardware():
    try:
        # Connect to MongoDB with the certificate
        client = MongoClient(
            uri,
            tls=True,
            tlsCertificateKeyFile=cert_path,
            tlsCAFile=certifi.where()
        )
        
        print("Connected to MongoDB successfully!")
        
        # Find the project_db database which contains our collections
        db_name = "project_db"
        db = client[db_name]
        
        # Make sure both collections exist
        required_collections = ["HwInUse", "HwSets"]
        for coll_name in required_collections:
            if coll_name not in db.list_collection_names():
                print(f"Error: Collection '{coll_name}' not found in '{db_name}' database")
                return False
                
        # Get the collections
        hw_in_use = db["HwInUse"]
        hw_sets = db["HwSets"]
        
        # Details for the checkout
        project_id = "001"  # Using string ID as requested
        hw_name = "HWSet2"
        checkout_amount = 20
        
        # 1. Check if the project exists
        projects = db["Projects"]
        project = projects.find_one({"_id": project_id})
        if project is None:
            print(f"Error: Project with ID {project_id} does not exist")
            return False
            
        print(f"Found project: {project['name']}")
        
        # 2. Check if the hardware set exists and has enough availability
        hw_set = hw_sets.find_one({"name": hw_name})
        if hw_set is None:
            print(f"Error: Hardware set '{hw_name}' does not exist")
            return False
            
        # Check if there's enough available in the hardware set
        if hw_set["avail"] < checkout_amount:
            print(f"Error: Not enough hardware available. Requested: {checkout_amount}, Available: {hw_set['avail']}")
            return False
            
        print(f"Hardware set '{hw_name}' found:")
        print(f"- Total capacity: {hw_set['capacity']}")
        print(f"- Currently available: {hw_set['avail']}")
        
        # 3. Check if this project already has some of this hardware checked out
        existing_checkout = hw_in_use.find_one({
            "project": project_id,
            "hw_name": hw_name
        })
        
        if existing_checkout is not None:
            # Update existing checkout
            new_amount = existing_checkout["amount"] + checkout_amount
            result = hw_in_use.update_one(
                {"_id": existing_checkout["_id"]},
                {"$set": {"amount": new_amount}}
            )
            print(f"Updated existing checkout: {existing_checkout['amount']} → {new_amount} units")
        else:
            # Create new checkout record
            new_checkout = {
                "project": project_id,
                "hw_name": hw_name,
                "amount": checkout_amount
            }
            result = hw_in_use.insert_one(new_checkout)
            print(f"Created new checkout with ID: {result.inserted_id}")
        
        # 4. Update hardware availability in HwSets collection
        new_availability = hw_set["avail"] - checkout_amount
        result = hw_sets.update_one(
            {"name": hw_name},
            {"$set": {"avail": new_availability}}
        )
        
        if result.modified_count == 1:
            print(f"Updated availability for '{hw_name}' in HwSets collection: {hw_set['avail']} → {new_availability}")
        else:
            print(f"Warning: Failed to update availability for '{hw_name}' in HwSets collection")
        
        # 5. Verify the checkout
        all_checkouts = list(hw_in_use.find({"project": project_id}))
        print(f"\nCurrent hardware checkouts for project {project_id}:")
        for checkout in all_checkouts:
            print(f"- {checkout['hw_name']}: {checkout['amount']} units")
            
        # 6. Verify the updated hardware set
        updated_hw_set = hw_sets.find_one({"name": hw_name})
        print(f"\nUpdated hardware set status:")
        print(f"- Name: {updated_hw_set['name']}")
        print(f"- Capacity: {updated_hw_set['capacity']}")
        print(f"- Available: {updated_hw_set['avail']}")
            
        return True
        
    except Exception as e:
        print(f"Error checking out hardware: {e}")
        return False
    finally:
        if 'client' in locals():
            client.close()
            print("\nMongoDB connection closed")

if __name__ == "__main__":
    checkout_hardware() 