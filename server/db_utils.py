# End points for all database related operations
users_db = {}  # Temporary in-memory storage (replace with MongoDB later)

def checkEmailExist(email):
    return email in users_db

def addUser(username, email, hashed_password):
    users_db[email] = {
        "username": username,
        "email": email,
        "password": hashed_password,
    }

def getUserHashedPassword(email):
    return users_db[email]["password"]