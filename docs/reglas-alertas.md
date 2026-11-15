# Reglas iniciales de alertas de ArgField

Son reglas transparentes de aviso, no diagnósticos ni umbrales agronómicos universales. Cada alerta informa ubicación, fuente, fecha y limita su alcance al punto consultado.

| Riesgo | Regla | Fuente | Límite |
| --- | --- | --- | --- |
| Calor intenso | Pronóstico de temperatura máxima de 35 °C o más durante 3 días consecutivos. | Open-Meteo Forecast API (`temperature_2m_max`). | Umbral inicial de monitoreo; puede no representar el umbral de daño de cada cultivo o etapa. |
| Precipitación abundante | Pronóstico de 50 mm o más en un día, o 100 mm o más acumulados en los 7 días consultados. | Open-Meteo Forecast API (`precipitation_sum`). | Es precipitación pronosticada en el punto; el riesgo de anegamiento depende del suelo, relieve y drenaje. |
| Posible déficit de humedad | Percentil publicado de humedad SAOCOM igual o menor a 20. | CONAE · SAOCOM. | Solo en cobertura publicada; un percentil puntual no demuestra estrés del cultivo ni describe todas las hectáreas. |

Si faltan valores, fechas válidas o cobertura, no se genera alerta. GPM IMERG, SMAP y Sentinel-2 se muestran como observaciones cuando hay una lectura válida; no se convierten por sí solas en diagnóstico. Open-Meteo documenta la temperatura máxima diaria a 2 m y la suma diaria de precipitación en su [especificación de variables](https://open-meteo.com/en/docs).
