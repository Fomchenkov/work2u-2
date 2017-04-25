const http = require("http");
const fs = require("fs");
const telebot = require("telebot");
const config = require("./config");

const TOKEN = "332428567:AAEwsRGzYiy1FCrAfqKGf227A1AOQvPWcfU";
const bot = new telebot(TOKEN);

const port = 4000;
const dirForUsers = "DataBase";
const counterFileName = "counter.json";
const lastMessage = "Спасибо! Ты прошел подготовку.";
const restartMessage = "Данные сброшены.\nНачните вновь, введя команду /start";

function myRequire(url) {
	let str, obj;
	try { 
		str = fs.readFileSync(url, "utf8");
		obj = JSON.parse(str);
	} 
	catch(e) { obj = {"question":1}; }
	return obj;
}

function incrementQuestion(msg) {
	let pathToDir = `./${dirForUsers}/${msg.from.username}/`;
	let counter = myRequire(pathToDir + counterFileName);
	let currentQuestion = counter.question;

	if (! config[currentQuestion]) {
		currentQuestion = 0;
	} else {
		currentQuestion++;
	}

	console.log("currentQuestion:", currentQuestion);
	// Занести изменения в файл
	let data = JSON.stringify({"question": currentQuestion });
	fs.writeFileSync(`${pathToDir}/${counterFileName}`, data);
}

function checkToEnd(msg) {
	let pathToDir, counter;

	try {
		pathToDir = `./${dirForUsers}/${msg.from.username}/`;
		counter = myRequire(pathToDir + counterFileName);
	} catch(e) {
		console.log("Called checkToEnd()");
		try {
			fs.mkdirSync(pathToDir);
			// Создать новые файлы со счетчиком вопросов и с ответами
			let data = JSON.stringify({"question":"1"});
			fs.writeFile(`${pathToDir}/${counterFileName}`, data, (err) => {});
			pathToDir = `./${dirForUsers}/${msg.from.username}/`;
			counter = myRequire(pathToDir + counterFileName);
		} catch (e) {}
	}

	console.log(counter);

	if (counter.question == 0) {
		bot.sendMessage(msg.from.id, lastMessage);
		return true;
	}
	return false;
}

function findAnswer(msg) {
	// Извлечь информацию о вопросе пользователя
	const pathToDir = `./${dirForUsers}/${msg.from.username}/`;
	let counter = myRequire(pathToDir + counterFileName);
	let currentQuestion = counter.question;
	// Выбрать и отправить сообщение пользователю
	return config[currentQuestion - 1];
}

function sendMessage(stepObj, msg) {
	let text;
	if (stepObj) text = stepObj.text;
	else text = lastMessage;
	let markup = bot.keyboard([["Далее"]], { resize: true });
	bot.sendMessage(msg.from.id, text, { markup, parse: "Markdown" })
}

bot.on("/restart", msg => {
	let username = msg.from.username;
	const pathToDir = `./${dirForUsers}/${username}/`;
	try {
		fs.unlinkSync(pathToDir + counterFileName);
		fs.rmdirSync(pathToDir);
	} catch(e) {}
	return bot.sendMessage(msg.from.id, restartMessage);
});

bot.on("/start", msg => {
	console.log(msg);
	// Создать папку и файлы для пользователя, если пользователь новый
	let username = msg.from.username;
	const pathToDir = `./${dirForUsers}/${username}/`;

	try {
		fs.mkdirSync(pathToDir);
		// Создать новые файлы со счетчиком вопросов и с ответами
		let data = JSON.stringify({"question": "1"});
		fs.writeFileSync(`${pathToDir}/${counterFileName}`, data);
	} catch (e) {
		// Если папка существует => пользвователь уже есть в сиситеме
		if (e.code !== "EEXIST") throw e;
		console.log("Dir is already exists");
	}

	let stepObj = findAnswer(msg);
	console.log(stepObj);
	sendMessage(stepObj, msg);
});

bot.on("text", msg => {
	console.log(msg);
	// Проверять, что введенный текст - не команда
	if (Array.isArray(msg.entities)) {
		if (msg.entities[0].type == "bot_command") {
			return;
		}
	}

	try {
		let username = msg.from.username;
		let pathToDir = `./${dirForUsers}/${username}/`;

		fs.mkdirSync(pathToDir);
		// Создать новые файлы со счетчиком вопросов и с ответами
		let data = JSON.stringify({"question": "1"});
		fs.writeFileSync(`${pathToDir}/${counterFileName}`, data);

		let stepObj = findAnswer(msg);
		return sendMessage(stepObj, msg);
	} catch (e) {}

	if (checkToEnd(msg)) return;
	// +1 к counterFileName
	incrementQuestion(msg);
	// Отправить сообщение
	let stepObj = findAnswer(msg);
	sendMessage(stepObj, msg);
});

// При первом развертывании создаем папку для пользователей
try { fs.mkdirSync("./" + dirForUsers); } 
catch (e) {}

bot.connect();

http.createServer((req, res) => {
	res.end("Bot working...");
}).listen(port);

console.log("Server started");
