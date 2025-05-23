from rest_framework import serializers
from .models import KnowledgeArticle


class KnowledgeArticleSerializer(serializers.ModelSerializer):
    class Meta:
        model = KnowledgeArticle
        fields= '__all__'
        # read_only_fields = ['created_by', 'updated_by' ]
    created_by = serializers.ReadOnlyField(source='created_by.username')
    modified_by = serializers.ReadOnlyField(source='updated_by.username')


