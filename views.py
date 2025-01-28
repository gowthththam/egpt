from django.shortcuts import render

# Create your views here.
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view
from rest_framework.response import Response

# views.py
from django.http import JsonResponse, HttpResponse
from django.views import View
from django.views.decorators.csrf import csrf_exempt
from huggingface_hub import InferenceClient
from PIL import Image
import io
import requests
from urllib.parse import unquote

# Initialize the client with your API token
client = InferenceClient("stabilityai/stable-diffusion-3.5-large", token="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")

API_URL = "https://api-inference.huggingface.co/models/distilbert/distilbert-base-uncased-finetuned-sst-2-english"
headers = {"Authorization": "Bearer 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"}

def content_filter(text):
    payload = {
        "inputs": text,
    }
    response = requests.post(API_URL, headers=headers, json=payload)
    filtered_output = response.json()
    return filtered_output

@api_view(['GET'])
@csrf_exempt
def GenerateImageView(request, text):
    try:
        decoded_text = unquote(text)
        image = client.text_to_image(decoded_text)
        img_byte_arr = io.BytesIO()
        image.save(img_byte_arr, format='PNG')
        img_byte_arr.seek(0)
        return HttpResponse(img_byte_arr.getvalue(), content_type='image/png')
    except Exception as e:
        return HttpResponse(f"An error occurred: {e}", status=500)

@api_view(['GET'])
@csrf_exempt
def apply_content_filter(request, text):
    try:
        filtered_text = content_filter(text)
        if isinstance(filtered_text, list) and len(filtered_text) > 0 and isinstance(filtered_text[0], list):
            response_data = filtered_text[0]  # Take the first element if it's a list of lists
        else:
            response_data = filtered_text  # Use as is if it's already in the correct format
        
        # Return the data in JSON format
        return JsonResponse([response_data], safe=False)
    except Exception as e:
        return Response({'error': 'An error occurred'}, status=500)