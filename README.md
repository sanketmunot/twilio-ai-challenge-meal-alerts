# twilio-ai-challenge-meal-alerts

## Functionality

### Environment Variables
- **TWILIO_ACCOUNT_SID** and **TWILIO_AUTH_TOKEN**: Twilio credentials for sending WhatsApp messages.
- **GEMINI_API_KEY**: API key for Google Generative AI.

### Twilio Client
- **getTwilioClient**: Creates and returns a Twilio client instance.

### Media Handling
- **saveMedia(mediaItem)**: Downloads and saves media items locally.
- **fileToGenerativePart(filePath, mimeType)**: Converts a file to a part that can be used with Google Generative AI.

### WhatsApp Message Building
- **buildWhatsAppMessage(data)**: Constructs a WhatsApp message with calorie information.

### Calorie Estimation
- **getCalories(imageParts)**: Sends images to Google's Generative AI for calorie estimation and parses the JSON response.

### Main Endpoint
- **POST /**: Handles incoming WhatsApp messages with media attachments.
  - Extracts media URLs and content types from the request body.
  - Saves the media locally.
  - Prepares media files for calorie estimation.
  - Calls **getCalories** to estimate calories.
  - Builds a WhatsApp message with the estimated calories.
  - Sends the message back to the user via Twilio.
  - Handles errors by sending an error message to the user.

## Flow
1. User sends an image of food via WhatsApp.
2. Twilio forwards the message to the server.
3. The server saves the image locally.
4. The server sends the image to Google's Generative AI for calorie estimation.
5. The server receives the estimated calorie information.
6. The server constructs a WhatsApp message with the calorie information.
7. The server sends the message back to the user via Twilio.
8. If any error occurs, an error message is sent to the user.
