from flask import Flask, request, jsonify
from flask_restx import Api, Resource, fields
from flask_bcrypt import Bcrypt
from flask_jwt_extended import create_access_token, JWTManager, jwt_required, get_jwt_identity
import datetime
from flask_cors import CORS
import sys
sys.path.append('../')
from database import db_access

app = Flask(__name__)
CORS(app, resources={r"/*": {
    "origins": ["http://localhost:3000", "http://localhost:3001"],
    "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    "allow_headers": ["Content-Type", "Authorization", "Accept"],
    "supports_credentials": True
}})
app.config["JWT_SECRET_KEY"] = "super-secret-key"  # Change this to a real secret in production!

api = Api(
    app,
    title="Authentication API",
    version="1.0",
    description="User Authentication API using JWT",
)
bcrypt = Bcrypt(app)
jwt = JWTManager(app)

# Namespace for different routes
auth_ns = api.namespace("auth", description="User Authentication Endpoints")
resources_ns = api.namespace("resources", description="Resource Management Endpoints")
project_ns = api.namespace("projects", description="Project Access Endpoints")

# Define User Registration and Login Models for Swagger
user_model = api.model(
    "User",
    {
        "username": fields.String(required=True, description="Username of the user"),
        "email": fields.String(required=True, description="User email"),
        "password": fields.String(
            required=True, description="User password", min_length=6
        ),
    },
)

login_model = api.model(
    "Login",
    {
        "email": fields.String(required=True, description="User email"),
        "password": fields.String(
            required=True, description="User password", min_length=6
        ),
    },
)

checkout_model = api.model(
    "Checkout",
    {
        "projectID": fields.String(required=True, description="Identify project to checkout resource"),
        "hardware_set": fields.String(required=True, description="Targeted hardware set"),
        "amount": fields.Integer(required=True, description="Amount to check out"),
    }
)

checkin_model = api.model(
    "Checkin",
    {
        "token": fields.String(required=True, description="JWT Access Token"),
        "hardware_set": fields.String(required=True, description="Targeted hardware set"),
        "amount": fields.Integer(required=True, description="Amount to check in"),
    }
)

project_create_model = api.model(
    "Project creation",
    {
        "name": fields.String(required=True, description="Name of the group"),
        "des": fields.String(required=True, description="Description of the group"),
        "projectID": fields.String(required=True, description="Unique ID of the group"),
    }
)

get_project_model = api.model(
    "Project creation",
    {
        "token": fields.String(required=True, description="JWT Access Token"),
        "projectID": fields.Integer(required=True, description="Unique ID of the group"),
    }
)

token_response = api.model(
    "TokenResponse",
    {
        "message": fields.String(description="Login status message"),
        "token": fields.String(description="JWT Access Token"),
    },
)

error_response = api.model(
    "ErrorResponse", {"message": fields.String(description="Error message")}
)

# ============================
# Define API Endpoints
# ============================

@app.route('/', methods=['POST'])
def home():
    data = request.json
    print(data)
    return "Flask API is running!", 200


@auth_ns.route("/register", methods=['POST'])
class Register(Resource):
    @api.expect(user_model)
    @api.response(201, "User registered successfully")
    @api.response(400, "User or email already exists", error_response)
    def post(self):
        """Register a new user"""
        data = request.json
        username, email, password = data["username"], data["email"], data["password"]

        if db_access.checkEmailExist(email):
            return {"message": "User or email already exists"}, 400

        hashed_password = bcrypt.generate_password_hash(password).decode("utf-8")  
        res = db_access.addUser(username, email, hashed_password)
        if res == 0:
            return {"message": "User registered successfully"}, 201
        else:
            return {"message": "User or email already exists"}, 400


@auth_ns.route("/login", methods=['POST'])
class Login(Resource):
    @api.expect(login_model)
    @api.response(200, "Login successful", token_response)
    @api.response(401, "Invalid credentials", error_response)
    def post(self):
        """Login user and return JWT token"""
        data = request.json
        email, password = data["email"], data["password"]

        if not db_access.checkEmailExist(email) or not bcrypt.check_password_hash(
            db_access.getUserHashedPassword(email), password
        ):
            return {"message": "Invalid credentials"}, 401

        # Get the username
        user_info = db_access.getUserInfo(email)
        username = user_info.get("username", "") if user_info else ""

        access_token = create_access_token(
            identity=email, expires_delta=datetime.timedelta(hours=1)
        )
        return {
            "message": "Login successful", 
            "token": access_token,
            "username": username
        }, 200

@resources_ns.route("/", methods=['GET'])
class Resources(Resource):
    """Get available hardware ressources"""
    def get(self):
        return db_access.getAvailHardwares(), 200

@resources_ns.route("/checkout", methods=['POST'])
class CheckOut(Resource):
    @api.expect(checkout_model)
    @api.response(202, "Successfully check out hardwares")
    @api.response(401, "Unauthorized")
    @api.response(503, "Service Unavailable")
    @jwt_required()
    def post(self):
        """Check out hardware resources"""
        data = request.json
        projectID, hardware_set, amount = data["projectID"], data["hardware_set"], data["amount"]
        # check for jwt token validity
        email = get_jwt_identity()
        # check if hardware available
        if not db_access.checkHardwareAvail(hardware_set, amount):
            return {"message": "Insufficient hardware resources"}, 503
        
        if db_access.checkoutHardwares(projectID, hardware_set, amount):
            return {"message": f"Successfully check out {amount} from {hardware_set}"}, 202
        else:
            return {"message": "Check out failed"}, 503


@resources_ns.route("/checkin", methods=['POST'])
class CheckIn(Resource):
    @api.expect(checkout_model)
    @api.response(202, "Successfully check in hardwares")
    @api.response(401, "Unauthorized")
    @api.response(503, "Service Unavailable")
    @jwt_required()
    def post(self):
        """Check in hardware resources"""
        data = request.json
        projectID, hardware_set, amount = data["projectID"], data["hardware_set"], data["amount"]
        # check for jwt token validity
        email = get_jwt_identity()

        # check if hardware available
        if not db_access.checkAssignedHardwares(projectID, hardware_set, amount):
            return {"message": "No enough hardware to check in"}, 503

        if db_access.checkInHardwares(projectID, hardware_set, amount):
            return {"message": f"Successfully check in {amount} of {hardware_set}"}, 202
        else:
            return {"message": "Check in failed"}, 503

@project_ns.route("/create", methods=['POST'])            
class CreateProject(Resource):
    @jwt_required()
    @api.expect(project_create_model)
    @api.response(200, "Project successfully created")
    @api.response(400, "Non-unique project ID")
    @api.response(400, "Unable to complete the request")
    def post(self):
        """Create a new project"""
        data = request.json
        name, des, projectID = data["name"], data["des"], data["projectID"]
        
        # Check if project ID already exists
        if db_access.checkProjectIDExists(projectID):
            return {"message": "Project ID already exists"}, 400
            
        email = get_jwt_identity()
        
        res = db_access.createProject(name, des, projectID, email)
        if res == -1:
            return {"message": "Non-unique project ID"}, 400
        elif res == 0:
            return {"message": "Project successfully created"}, 200
        else:
            return {"message": "Unable to complete the request"}, 400

@project_ns.route("/get_project", methods=['GET'])  
class GetProject(Resource):
    @jwt_required()
    @api.expect(get_project_model)
    @api.response(200, "Project information found and returned")
    @api.response(400, "Project not found or invalid credentials")
    def get(self):
        """Get the information of a project"""
        data = request.json
        projectID = data["projectID"]
        email = get_jwt_identity()

        res = db_access.getProject(email, projectID)
        if res == None:
            return {"message": "Invalid operations"}, 400
        else:
            return res['users'], 200

@project_ns.route("/user_projects", methods=['GET'])
class UserProjects(Resource):
    @jwt_required()
    @api.response(200, "Projects retrieved successfully")
    @api.response(400, "Unable to retrieve projects")
    def get(self):
        """Get all projects for the logged-in user"""
        email = get_jwt_identity()
        projects = db_access.getUserProjects(email)
        
        return {"projects": projects}, 200

@project_ns.route("/join", methods=['POST'])
class JoinProject(Resource):
    @jwt_required()
    @api.expect(api.model("JoinProject", {
        "projectID": fields.String(required=True, description="ID of the project to join")
    }))
    @api.response(200, "Successfully joined project")
    @api.response(400, "Project not found")
    def post(self):
        """Join an existing project"""
        data = request.json
        projectID = data["projectID"]
        email = get_jwt_identity()
        
        # Don't convert projectID here, let the joinProject function handle it
        result = db_access.joinProject(email, projectID)
        
        if result == 0:
            return {"message": "Successfully joined project"}, 200
        else:
            return {"message": "Project not found"}, 400

@project_ns.route("/check_id_exists", methods=['GET'])
class CheckProjectIDExists(Resource):
    @jwt_required()
    @api.response(200, "ID check completed")
    def get(self):
        """Check if a project ID already exists"""
        project_id = request.args.get('id')
        
        # Don't convert to int here, let the db_access function handle it
        exists = db_access.checkProjectIDExists(project_id)
        return {"exists": exists}, 200

@project_ns.route("/leave", methods=['POST'])
class LeaveProject(Resource):
    @jwt_required()
    @api.expect(api.model("LeaveProject", {
        "projectID": fields.String(required=True, description="ID of the project to leave")
    }))
    @api.response(200, "Successfully left project")
    @api.response(404, "Project not found")
    @api.response(403, "User is not a member of this project")
    @api.response(500, "Server error")
    def post(self):
        """Leave a project (will delete project if last user)"""
        data = request.json
        projectID = data["projectID"]
        email = get_jwt_identity()
        
        # First check if the project exists
        if not db_access.checkProjectIDExists(projectID):
            return {"message": "Project not found"}, 404
            
        # Get the project to check if user is a member
        project = db_access.getProjectDirectly(projectID)
        if not project:
            return {"message": "Project not found"}, 404
            
        # Check if user is a member
        if email not in project.get('users', []):
            return {"message": "You are not a member of this project"}, 403
            
        # Count number of users in the project
        user_count = len(project.get('users', []))
        
        # If last user, delete the project
        if user_count <= 1:
            # Release all hardware resources associated with this project
            result = db_access.releaseAllProjectHardware(projectID)
            if result != 0:
                return {"message": "Error releasing hardware resources"}, 500
                
            # Delete the project
            result = db_access.deleteProject(projectID)
            if result != 0:
                return {"message": "Error deleting project"}, 500
                
            return {"message": "You were the last member. Project has been deleted."}, 200
        else:
            # Not the last user, just remove this user from the project
            result = db_access.removeUserFromProject(email, projectID)
            if result != 0:
                return {"message": "Error removing user from project"}, 500
                
            return {"message": "Successfully left the project"}, 200

# Add namespaces to API
api.add_namespace(auth_ns, path="/auth")
api.add_namespace(resources_ns, path="/resources")

"""
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080, debug=True)  # Runs on port 8080
"""

if __name__ == "__main__":
    app.run(debug=True)
