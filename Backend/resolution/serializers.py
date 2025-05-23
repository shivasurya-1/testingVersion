from rest_framework import serializers
from .models import Resolution

class ResolutionSerializer(serializers.ModelSerializer):
    created_by = serializers.SlugRelatedField(read_only=True, slug_field='username')
    modified_by = serializers.SlugRelatedField(read_only=True, slug_field='username')
    class Meta:
        model = Resolution
        fields = '__all__'
        
        extra_kwargs = {
            'ticket_id': {'required': True},
            'created_by': {'read_only': True},  
            'modified_by': {'read_only': True},
        }
            