import { Client, LocalAuth, Message } from "whatsapp-web.js";
import qrcode from "qrcode-terminal";
import dotenv from "dotenv";
import { generateText } from "./pollinations";

dotenv.config();

const BOT_NAME = process.env.BOT_NAME || "PollBot";

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
  },
});

client.on("qr", (qr) => {
  console.log("Escanea este codigo QR con WhatsApp:");
  qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
  console.log(`${BOT_NAME} esta listo y conectado.`);
});

client.on("authenticated", () => {
  console.log("Autenticado correctamente.");
});

client.on("auth_failure", (msg) => {
  console.error("Fallo de autenticacion:", msg);
});

function isMentioned(body: string): boolean {
  const mentionPattern = /@[\w]+/;
  return mentionPattern.test(body);
}

function extractQuestionFromMention(body: string): string {
  return body.replace(/@[\w]+\s*/g, "").trim();
}

async function isReplyToBot(msg: Message): Promise<boolean> {
  if (!msg.hasQuotedMsg) return false;
  const quotedMsg = await msg.getQuotedMessage();
  return quotedMsg.author === client.info.wid._serialized;
}

async function getQuotedMessageText(msg: Message): Promise<string> {
  if (!msg.hasQuotedMsg) return "";
  const quotedMsg = await msg.getQuotedMessage();
  return quotedMsg.body;
}

async function handleMessage(msg: Message) {
  const chat = await msg.getChat();
  const contact = await msg.getContact();
  const body = msg.body.trim();

  if (msg.fromMe) return;

  const isGroup = chat.isGroup;
  let shouldRespond = false;
  let question = "";

  if (isGroup) {
    const mentionedIds = msg.mentionedIds || [];
    const botId = client.info.wid._serialized;
    const isMentionedInGroup = mentionedIds.some((id) => id === botId);
    const isReplyToBotMsg = await isReplyToBot(msg);

    if (isMentionedInGroup) {
      shouldRespond = true;
      question = extractQuestionFromMention(body);
    } else if (isReplyToBotMsg) {
      shouldRespond = true;
      const quotedText = await getQuotedMessageText(msg);
      question = body || quotedText;
    }
  } else {
    shouldRespond = true;
    question = body;
  }

  if (!shouldRespond || !question) return;

  console.log(
    `[${isGroup ? "GRUPO: " + chat.name : "PRIVADO"}] ${contact.pushname}: ${question}`,
  );

  await chat.sendStateTyping();

  const thinkingMessages = [
    `_Pensando..._`,
    `_Procesando tu pregunta..._`,
    `_Un momento, estoy generando la respuesta..._`,
  ];
  const thinkingMsg =
    thinkingMessages[Math.floor(Math.random() * thinkingMessages.length)];
  const sentMsg = await msg.reply(thinkingMsg);

  try {
    const response = await generateText(question);

    await sentMsg.edit(response);
    console.log(`Respuesta enviada a ${contact.pushname}`);
  } catch (error) {
    console.error("Error al generar respuesta:", error);
    await sentMsg.edit(
      "_Hubo un error al generar la respuesta. Intenta de nuevo._",
    );
  }
}

client.on("message", handleMessage);

client.on("message_create", (msg) => {
  if (msg.fromMe) return;
  handleMessage(msg);
});

console.log(`Iniciando ${BOT_NAME}...`);
client.initialize();
