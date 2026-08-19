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
        fields = ["id_objetivo", "anno", "activo", "minimo", "maximo", "areas"]
        read_only_fields = ["minimo", "maximo"]

    def create(self, validated_data):
        from decimal import Decimal
        areas_data = validated_data.pop("areas")
        
        total_min = sum(Decimal(str(a.get("minimo", 0.00))) for a in areas_data)
        total_max = sum(Decimal(str(a.get("maximo", 0.00))) for a in areas_data)
        
        validated_data["minimo"] = total_min
        validated_data["maximo"] = total_max
        validated_data["id_modulo_id"] = 1 # COMERCIAL

        objetivo = ObjetivoAnual.objects.create(**validated_data)

        for area in areas_data:
            ObjetivoAnualArea.objects.create(
                id_objetivo=objetivo,
                **area
            )

        return objetivo

    def update(self, instance, validated_data):
        from decimal import Decimal
        areas_data = validated_data.pop("areas", None)

        instance.anno = validated_data.get("anno", instance.anno)
        instance.activo = validated_data.get("activo", instance.activo)

        if areas_data:
            total_min = sum(Decimal(str(a.get("minimo", 0.00))) for a in areas_data)
            total_max = sum(Decimal(str(a.get("maximo", 0.00))) for a in areas_data)
            instance.minimo = total_min
            instance.maximo = total_max

            for area in areas_data:
                ObjetivoAnualArea.objects.update_or_create(
                    id_objetivo=instance,
                    id_area=area["id_area"],
                    defaults={
                        "minimo": area["minimo"],
                        "maximo": area["maximo"]
                    }
                )
        instance.save()
        return instance
