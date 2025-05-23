
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import Organisation, Employee
from .serializers import AssigneeSerializer,OrganisationSerializer, EmployeeSerializer
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.shortcuts import get_object_or_404
from organisation_details.tasks import send_organisation_creation_email
from roles_creation.permissions import HasRolePermission


import logging

logger = logging.getLogger(__name__)

class OrganisationAPI(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]
   
    
    def get(self, request, organisation_id=None):
        self.permission_required = "view_organization"
    
        if not HasRolePermission().has_permission(request, self.permission_required):
         return Response({'error': 'Permission denied.'}, status=403)
        print("done")

        logger.info("OrganizationList view was called")
       
        if organisation_id:
            try:
                organisation = Organisation.objects.get(organisation_id=organisation_id)
                serializer = OrganisationSerializer(organisation)
                return Response(serializer.data)
            except Organisation.DoesNotExist:
                return Response({"error": "Organisation not found."}, status=status.HTTP_404_NOT_FOUND)
        else:
            organisations = Organisation.objects.all()
            serializer = OrganisationSerializer(organisations, many=True)
            return Response(serializer.data)
        
    
    

    # POST: Create a new organisation 
    def post(self, request):
        self.permission_required = "create_organization"
    
        if not HasRolePermission().has_permission(request, self.permission_required):
         return Response({'error': 'Permission denied.'}, status=403)

       
        serializer = OrganisationSerializer(data=request.data)
        if serializer.is_valid():
            organisation = serializer.save(created_by=request.user)
            send_organisation_creation_email.delay(
                organisation.organisation_name,
                organisation.organisation_mail
            )
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # PUT: Update an existing organisation
    def put(self, request, organisation_id=None):
        self.permission_required = "update_organization"
    
        if not HasRolePermission().has_permission(request, self.permission_required):
         return Response({'error': 'Permission denied.'}, status=403)
        try:
            organisation = Organisation.objects.get(organisation_id=organisation_id)
        except Organisation.DoesNotExist:


            
            return Response({"error": "Organisation not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = OrganisationSerializer(organisation, data=request.data)
        if serializer.is_valid():
            organisation = serializer.save(modified_by=request.user)
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # DELETE: Delete an organisation
    def delete(self, request, organisation_id=None):
        self.permission_required = "delete_organization"
    
        if not HasRolePermission().has_permission(request, self.permission_required):
         return Response({'error': 'Permission denied.'}, status=403)
        try:
            organisation = Organisation.objects.get(organisation_id=organisation_id)
            organisation.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Organisation.DoesNotExist:
            return Response({"error": "Organisation not found."}, status=status.HTTP_404_NOT_FOUND)
        

class TreeEmployeeAPI(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def get(self, request, organisation_id=None, employee_id=None):
    #     self.permission_required = "view_employee_tree"
    
        # if not HasRolePermission().has_permission(request, self.permission_required):
        #     return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)


        organisation_id= request.user.organisation
        if organisation_id:
            print(organisation_id)
            employees = Employee.objects.filter(organisation_id=organisation_id)
            serializer = EmployeeSerializer(employees, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response({"error": "Invalid request."}, status=status.HTTP_400_BAD_REQUEST)
    

class autoAssigneeAPIView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def get(self, request, organisation_id=None, employee_id=None):
        self.permission_required = "view_employee"
        if not HasRolePermission().has_permission(request, self.permission_required):
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        if 1:
            employees = Employee.objects.all()
            serializer = AssigneeSerializer(employees, many=True)
            result = []
            for user in serializer.data:
                transformed_user = {
                    "username": user["username"],
                    "organisation_name": user["organisation_name"],
                    "solutiongroup": [sg["solution_group_name"] for sg in user["solutiongroup"]]
                }
                result.append(transformed_user)
                    
                    
            return Response(result, status=status.HTTP_200_OK)


        return Response({"error": "Invalid request."}, status=status.HTTP_400_BAD_REQUEST)
    

# class EmployeeAPI(APIView):
#     permission_classes = [IsAuthenticated]
#     authentication_classes = [JWTAuthentication]

#     def get(self, request, organisation_id=None, employee_id=None):
#         # self.permission_required = "view_employee"  
#         # HasRolePermission.has_permission(self,request,self.permission_required)
#         """Handles fetching employees for a specific organisation or a single employee"""
#         self.permission_required = "view_employee"
#         if not HasRolePermission().has_permission(request, self.permission_required):
#             return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
#         organisation_id = request.user.organisation
#         if organisation_id:
#             employees = Employee.objects.filter(organisation_id=organisation_id)
#             serializer = EmployeeSerializer(employees, many=True)
#             return Response(serializer.data, status=status.HTTP_200_OK)

#         elif employee_id:
#             try:
#                 employee = Employee.objects.get(id=employee_id)
#                 serializer = EmployeeSerializer(employee)
#                 return Response(serializer.data, status=status.HTTP_200_OK)
#             except Employee.DoesNotExist:
#                 return Response({"error": "Employee not found."}, status=status.HTTP_404_NOT_FOUND)

#         return Response({"error": "Invalid request."}, status=status.HTTP_400_BAD_REQUEST)
    

#     def post(self, request, organisation_id=None):
#         self.permission_required = "create_employee"  
#         HasRolePermission.has_permission(self,request,self.permission_required) 
#         """
#         Create an employee. If `organisation_id` is provided in the URL,
#         it will automatically associate the employee with that organisation.
#         """
#         if organisation_id:
#             # Attach organisation ID from URL if provided
#             request.data["organisation"] = organisation_id

#         serializer = EmployeeSerializer(data=request.data)
#         if serializer.is_valid():
#             serializer.save(created_by=request.user)
#             return Response(serializer.data, status=status.HTTP_201_CREATED)
        
#         return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

#     def put(self, request, employee_id):
#         self.permission_required = "update_employee"  
#         HasRolePermission.has_permission(self,request,self.permission_required) 
#         employee = get_object_or_404(Employee, id=employee_id)
#         serializer = EmployeeSerializer(employee, data=request.data, partial=True)
#         if serializer.is_valid():
#             serializer.save(created_by=request.user, modified_by=request.data)
#             return Response(serializer.data)
#         return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

#     def delete(self, request, employee_id):
#         self.permission_required = "delete_employee"  
#         HasRolePermission.has_permission(self,request,self.permission_required)
#         employee = get_object_or_404(Employee, id=employee_id)
#         employee.delete()
#         return Response(status=status.HTTP_204_NO_CONTENT)



class EmployeeAPI(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]
 
    def get(self, request, organisation_id=None, employee_id=None):
        self.permission_required = "view_employee"
        if not HasRolePermission.has_permission(self, request, self.permission_required):
            return Response({"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)
        organisation_id = request.user.organisation
 
        if organisation_id:
            # Only fetch top-level employees
            top_level_employees = Employee.objects.filter(organisation_id=organisation_id, parent=None)
            serializer = EmployeeSerializer(top_level_employees, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
 
        elif employee_id:
            try:
                employee = Employee.objects.get(id=employee_id)
                serializer = EmployeeSerializer(employee)
                return Response(serializer.data, status=status.HTTP_200_OK)
            except Employee.DoesNotExist:
                return Response({"error": "Employee not found."}, status=status.HTTP_404_NOT_FOUND)
 
        return Response({"error": "Invalid request."}, status=status.HTTP_400_BAD_REQUEST)
 
 
   
 
    def post(self, request, organisation_id=None):
        self.permission_required = "create_employee"  
        HasRolePermission.has_permission(self,request,self.permission_required)
        """
        Create an employee. If `organisation_id` is provided in the URL,
        it will automatically associate the employee with that organisation.
        """
        if organisation_id:
            # Attach organisation ID from URL if provided
            request.data["organisation"] = organisation_id
 
        serializer = EmployeeSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(created_by=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
       
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
 
   
    def put(self, request, employee_id):
        self.permission_required = "update_employee"
        if not HasRolePermission.has_permission(self, request, self.permission_required):
            return Response({"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)
 
        employee = get_object_or_404(Employee, employee_id=employee_id)
 
        # Copy and modify data to convert `parent=0` to `None`
        data = request.data.copy()
        if str(data.get("parent")) == "0":
            data["parent"] = None
 
        serializer = EmployeeSerializer(employee, data=data, partial=True)
        if serializer.is_valid():
            serializer.save(modified_by=request.user)
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
 
 
    def delete(self, request, employee_id):
        self.permission_required = "delete_employee"  
        HasRolePermission.has_permission(self,request,self.permission_required)
        employee = get_object_or_404(Employee, id=employee_id)
        employee.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
 
 
 
 
 
 