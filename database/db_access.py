from pymongo import MongoClient

def db_init():
    uri = "mongodb+srv://ece461lab.rm3iy.mongodb.net/?authSource=%24external&authMechanism=MONGODB-X509&retryWrites=true&w=majority&appName=ECE461Lab"
    client = MongoClient(uri,
                         tls=True,
                         tlsCertificateKeyFile='X509-cert-4851382559130201289.pem')

    global db 
    db = client['sample_mflix']
    global collection
    collection = db['users']

def db_test():
    doc_count = collection.count_documents({})
    print(doc_count)
    result = collection.find({'email': 'barbara_gonzalez@fakegmail.com'})
    for i in result:
        print(i)
