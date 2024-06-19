const express = require("express");
const app = express();
require("dotenv").config();
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
const twilio = require("twilio");
const { Readable } = require("stream");
const extName = require("ext-name");
const urlUtil = require("url");
const { GoogleGenerativeAI } = require("@google/generative-ai");

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const port = 3000;

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

function getTwilioClient() {
  return twilio(accountSid, authToken);
}

async function saveMedia(mediaItem) {
  const { mediaUrl, filename } = mediaItem;
  const fullPath = path.resolve(`./${filename}`);
  const writeStream = fs.createWriteStream(fullPath, { flags: "a" });
  const response = await fetch(mediaUrl);
  const rb = Readable.fromWeb(response.body);

  return new Promise((resolve, reject) => {
    rb.pipe(writeStream);
    rb.on("end", resolve);
    rb.on("error", reject);
  });
}

function buildWhatsAppMessage(data) {
  const totalCalories = data.calorie;
  const items = data.items.map((item) => {
    return `${item.item}: ${item.calorie} cal (Carbs: ${item.carbs}, Fiber: ${item.fiber}, Fat: ${item.fat}, Protein: ${item.protein})`;
  });

  const message = `
    Hello! 🍽️
    *Total Calories:* ${totalCalories}

    *Breakdown:*
    ${items.map((item) => `- *${item}*`).join("\n")}

    Enjoy your meal!
  `;

  return message.trim();
}

function fileToGenerativePart(filePath, mimeType) {
  return {
    inlineData: {
      data: Buffer.from(fs.readFileSync(filePath)).toString("base64"),
      mimeType,
    },
  };
}

async function getCalories(imageParts) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `
    Here is an image of food. Return me a text in JSON string.
    The result should only have JSON data
    showing approximate calories of the whole dish with the key 'calorie'. 
    Also, if possible, add an array of objects containing key 
    as item in picture, with individual items calorie.
    Categorize each item for carbs, fiber, fat, and protein.
  `;

  const result = await model.generateContent([prompt, ...imageParts]);
  const response = await result.response;
  let text = response.text();
  text = text.replace(/```/g, "").replace(/json/, "");
  console.log(text);
  return JSON.parse(text);
}

app.post("/", async (req, res) => {
  const body = req.body;
  const NumMedia = body.NumMedia;
  const mediaItems = [];

  for (let i = 0; i < NumMedia; i++) {
    const mediaUrl = body[`MediaUrl${i}`];
    const contentType = body[`MediaContentType${i}`];
    const extension = extName.mime(contentType)[0].ext;
    const mediaSid = path.basename(urlUtil.parse(mediaUrl).pathname);
    const filename = `images/${mediaSid}.${extension}`;

    mediaItems.push({ mediaUrl, filename, contentType });
  }

  try {
    await Promise.all(mediaItems.map((mediaItem) => saveMedia(mediaItem)));

    const images = mediaItems.map((item) =>
      fileToGenerativePart(item.filename, item.contentType)
    );

    const calorieData = await getCalories(images);
    if(calorieData[calorie]<1){
      throw new Error;
    }
    const message = buildWhatsAppMessage(calorieData);
    const client = getTwilioClient();
    client.messages
      .create({
        from: "whatsapp:+14155238886",
        body: message,
        to: body['From'],
      })
      .then((message) => console.log(message.sid));
  } catch (error) {
    const client = getTwilioClient();
    client.messages
      .create({
        from: "whatsapp:+14155238886",
        body: "I am sorry, there seems to be an issue. Please try again with a proper image.",
        to: body['From'],
      })
      .then((message) => console.log(message.sid));
  }
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
