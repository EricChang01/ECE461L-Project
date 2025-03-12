# End points for all database related operations
users_db = {}  # Temporary in-memory storage (replace with MongoDB later)
hardwares = {"hw1": 100, "hw2": 100}
assigned = {}

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

def checkHardwareAvail(hardware_set, amount):
    return hardwares[hardware_set] >= amount

def checkoutHardwares(email, hardware_set, amount):
    if not checkHardwareAvail(hardware_set, amount):
        return False    
    else:
        hardwares[hardware_set] -= amount
        if email not in assigned:
            assigned[email] = {}
        if hardware_set not in assigned[email]:
            assigned[email][hardware_set] = 0
        assigned[email][hardware_set] += amount
        return True

def checkAssignedHardwares(email, hardware_set, amount):
    return assigned[email][hardware_set] >= amount

def checkInHardwares(email, hardware_set, amount):
    if not checkAssignedHardwares(email, hardware_set, amount):
        return False
    else:
        assigned[email][hardware_set] -= amount
        hardwares[hardware_set] += amount
        return True