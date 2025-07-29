import openai
import os
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables from .env if present
load_dotenv()

# Create OpenAI client. If OPENAI_BASE_URL is provided (e.g., for Azure or a proxy) we honour it,
# otherwise we fall back to the standard public endpoint.
_api_key = os.getenv('OPENAI_API_KEY')
_custom_base = os.getenv('OPENAI_BASE_URL')

if not _api_key:
    raise ValueError("OPENAI_API_KEY environment variable is required")

if _custom_base:
    client = OpenAI(api_key=_api_key, base_url=_custom_base)
else:
    client = OpenAI(api_key=_api_key)

# Default to OpenAI's public GPT model unless overridden
model_name = os.getenv('MODEL_NAME', 'gpt-4o')

def send_to_openai(prompt, data):
    try:
        response = client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": prompt.format(data=data)}
            ],
            max_tokens=1500,
            stream=False
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        # Re-raise with more specific error information
        raise Exception(f"OpenAI API error: {str(e)}") from e