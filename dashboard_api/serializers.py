from rest_framework import serializers
from core.models import ObjetivoAnual, ObjetivoAnualArea

class ObjetivoAnualAreaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ObjetivoAnualArea
        fields = ["id_area", "minimo", "maximo"]

class ObjetivoAnualSerializer(serializers.ModelSerializer):
    areas = ObjetivoAnualAreaSerializer(many=True)

    class Meta:
        model = ObjetivoAnual
        fields = ["id_objetivo", "anno", "activo", "areas"]

    def create(self, validated_data):
        areas_data = validated_data.pop("areas")

        objetivo = ObjetivoAnual.objects.create(**validated_data)

        for area in areas_data:
            ObjetivoAnualArea.objects.create(
                id_objetivo=objetivo,
                **area
            )

        return objetivo

    def update(self, instance, validated_data):
        areas_data = validated_data.pop("areas", None)

        instance.anno = validated_data.get("anno", instance.anno)
        instance.activo = validated_data.get("activo", instance.activo)
        instance.save()

        if areas_data:
            for area in areas_data:
                ObjetivoAnualArea.objects.update_or_create(
                    id_objetivo=instance,
                    id_area=area["id_area"],
                    defaults={
                        "minimo": area["minimo"],
                        "maximo": area["maximo"]
                    }
                )

        return instance
