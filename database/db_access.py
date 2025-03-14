from pymongo import MongoClient
# from flask import jsonify

def db_init():
    uri = "mongodb+srv://ece461lab.rm3iy.mongodb.net/?authSource=%24external&authMechanism=MONGODB-X509&retryWrites=true&w=majority&appName=ECE461Lab"
    client = MongoClient(uri,
                         tls=True,
                         tlsCertificateKeyFile='X509-cert-4851382559130201289.pem')

    global user_db 
    user_db = client['user_data']
    global user_col
    user_col = user_db['users']

    global hw_db 
    hw_db = client['hw_stats']
    global hws_col
    hws_col = hw_db['hws']
    global checkout_col
    checkout_col = hw_db['checked_out']



def checkEmailExist(email):
    # result = user_col.find({'email': email})
    # result = [x for x in result]
    # return result
    return user_col.count_documents({'email': email})


def addUser(username, email, hashed_password):
    count = user_col.count_documents({ "$or": [
        {"username": username},
        {"email": email}
    ]})

    if count:
        return -1

    user_col.insert_one({
        "username": username,
        "email": email,
        "password": hashed_password,
    })
    return 0

def getUserHashedPassword(email):
    count = user_col.count_documents({'email': email})
    if count != 1:
        return None
    result = user_col.find({'email': email}, {"password": 1})

    for x in result:
        return x["password"]
    return None

def getAvailHardwares():
    all_hw = hws_col.find({})
    result = {}
    for x in all_hw:
        result[x["name"]] = x["avail"]
    return result

def checkHardwareAvail(hardware_set, amount):
    result = hws_col.find({'name': hardware_set})
    for x in result:
        return x["avail"] >= amount
    return None

def checkoutHardwares(email, hardware_set, amount):
    if not checkHardwareAvail(hardware_set, amount):
        return False

    result = hws_col.update_one({'name': hardware_set, 'avail': {'$gte': amount}}, {'$inc': {'avail': -amount}})
    if result.modified_count != 1:
        return False

    if checkout_col.count_documents({'email':email, 'hw_name':hardware_set}) > 0:
        result = checkout_col.update_one({'email':email, 'hw_name':hardware_set}, {'$inc':{'amount': amount}})
    else:
        checkout_col.insert_one({'email':email, 'hw_name':hardware_set, 'amount':amount})
    return True

def checkAssignedHardwares(email, hardware_set, amount):
    return 0 < checkout_col.count_documents({'email':email, 'hw_name':hardware_set, 'amount': {'$gte': amount}}) 

def checkInHardwares(email, hardware_set, amount):
    if not checkAssignedHardwares(email, hardware_set, amount):
        return False

    result = checkout_col.update_one({'email':email, 'hw_name':hardware_set, 'amount': {'$gte': amount}}, {'$inc': {'amount': -amount}})
    if result.modified_count != 1:
        return False

    result = hws_col.update_one({'name': hardware_set}, {'$inc': {'avail': amount}})
    if result.modified_count != 1:
        return False

    checkout_col.delete_one({'amount': {'$lte': 0}})
    return True


def db_test():
    db_init()
    doc_count = user_col.count_documents({})
    print(doc_count)

    # user_col.delete_many({'username': 'foobar'})

    # result = user_col.find({'username': 'foobar'})#find({'email': { "$regex" : "fakegmail.com" }})
    # for i in result:
    #     print(i)

    # user_col.insert_one({'username': 'foobar', 'email': 'fbar@gmail.com', 'name': 'Foo Bar', 'pwd': 'hash2'})

    # result = user_col.find({'username': 'foobar'})#find({'email': { "$regex" : "fakegmail.com" }})
    # for i in result:
    #     print(i)

    print(checkEmailExist('fbar@gmail.com'))
    addUser('foobar', 'fbar@gmail.com', 'hash')
    addUser('foobar2', 'fbar2@gmail.com', 'hash2')
    print(checkEmailExist('fbar@gmail.com'))
    print(getUserHashedPassword('fbar2@gmail.com'))

    print(getAvailHardwares())
    # print(checkoutHardwares('fbar@gmail.com', 'hw1', 15))
    print(checkInHardwares('fbar@gmail.com', 'hw1', 5))



if __name__ == "__main__":
    db_test()
