const { Telegraf, Markup, session } = require('telegraf');
const {wordsGerundSeason1, wordsGerundSeason2} = require("./constants");
const bot = new Telegraf('6805056334:AAFuEGSRI32nilyqmcKIDkR6TZK3Lh7DUEI');
const LocalSession = require('telegraf-session-local');
const express = require('express');

const localSession = new LocalSession({
    database: 'session_db.json'
});

bot.use(localSession.middleware());

// Start komandasi
bot.start((ctx) => {
    ctx.session.correctAnswers = 0;
    ctx.session.wrongAnswers = [];
    ctx.session.skippedWords = [];
    ctx.reply('Salom! Qaysi mavzuni tanlaysiz?',
        Markup.keyboard([
            ['Gerund and infinitive (1 season)', 'Gerund and infinitive (2 season)']
        ]).oneTime().resize()
    );
});

// Foydalanuvchi 1-chi mavzuni tanlaydi
bot.hears('Gerund and infinitive (1 season)', async (ctx) => {
    ctx.session.words = [...wordsGerundSeason1]; // So'zlarni sessiyaga saqlaymiz
    ctx.session.correctAnswers = 0;
    ctx.session.wrongAnswers = [];
    ctx.session.skippedWords = [];
    ctx.session.totalQuestions = 0;
   await sendQuestion(ctx);
});

// Foydalanuvchi 2-chi mavzuni tanlaydi
bot.hears('Gerund and infinitive (2 season)', async (ctx) => {
    ctx.session.examples = [...wordsGerundSeason2];
    ctx.session.correctAnswers = 0;
    ctx.session.wrongAnswers = [];
    ctx.session.skippedWords = [];
    ctx.session.totalQuestions = 0;
    await sendExampleQuestion(ctx);
});

// 1-Mavzu: Savolni yuborish va variantlarni taklif qilish
async function sendQuestion(ctx) {
    if (ctx.session.words.length === 0) {
        await ctx.reply('Barcha savollar tugadi.');
        await showResults(ctx);
        return;
    }

    const selectedWord = ctx.session.words.pop();
    ctx.session.selectedWord = selectedWord;
    ctx.session.totalQuestions++;

    await ctx.reply(`'${selectedWord.word}' - quyidagi so'zdan keyin qaysi qo'shimchali so'z keladi?`,
        Markup.keyboard([
            ['+ ing', ' + To', '+ To Object'],
            ['To\'xtatish', 'Keyingisi']
        ]).oneTime().resize()
    );
}

// 1-Mavzu: Foydalanuvchi javobini tekshirish
bot.hears(['+ ing', '+ To', '+ To Object'], async (ctx) => {
    const userAnswer = ctx.message.text;
    const correctAnswer = ctx.session.selectedWord.category;

    if (userAnswer === correctAnswer) {
        ctx.session.correctAnswers++;
        await ctx.reply('To\'g\'ri!');
    } else {
        ctx.session.wrongAnswers.push(ctx.session.selectedWord);
        await ctx.reply(`Noto'g'ri. To'g'ri javob: ${correctAnswer}.`);
    }

    await sendQuestion(ctx);
});

// 2-Mavzu: Savolni yuborish va variantlarni taklif qilish
async function sendExampleQuestion(ctx) {
    if (ctx.session.examples.length === 0) {
        await ctx.reply('Barcha savollar tugadi.');
        await showResults(ctx);
        return;
    }

    const selectedExample = ctx.session.examples.pop();
    ctx.session.selectedExample = selectedExample;
    ctx.session.totalQuestions++;

    await ctx.reply(`To'ldiring: ${selectedExample.question}`,
        Markup.keyboard([
            ['To\'xtatish', 'Keyingisi']
        ]).oneTime().resize()
    );
}

// 2-Mavzu: Foydalanuvchi javobini tekshirish
bot.on('text', async (ctx) => {
    const userAnswer = ctx.message.text.trim().toLowerCase();

    if (userAnswer === 'to\'xtatish') {
        await showResults(ctx);
        return;
    }

    if (userAnswer === 'keyingisi') {
        ctx.session.skippedWords.push(ctx.session.selectedExample);
        await sendExampleQuestion(ctx);
        return;
    }

    const correctAnswer = ctx.session.selectedExample.answer;

    if (userAnswer === correctAnswer) {
        ctx.session.correctAnswers++;
        await ctx.reply('To\'g\'ri!');
    } else {
        ctx.session.wrongAnswers.push(ctx.session.selectedExample);
        await ctx.reply(`Noto'g'ri. To'g'ri javob: ${correctAnswer}.`);
    }

    await sendExampleQuestion(ctx);
});

async function showResults(ctx) {
    const wrongCount = ctx.session.wrongAnswers.length;
    const skippedCount = ctx.session.skippedWords.length;
    const correctCount = ctx.session.correctAnswers;

    let resultMessage = `O'yin tugadi! Siz ${ctx.session.totalQuestions} savoldan ${correctCount} tasini to'g'ri topdingiz.\n`;
    resultMessage += `Xato javoblar soni: ${wrongCount}\n`;
    resultMessage += `Tashlab ketilgan so'zlar soni: ${skippedCount}\n`;

    if (wrongCount > 0) {
        resultMessage += `Xato qilingan so'zlar:\n`;
        ctx.session.wrongAnswers.forEach((item) => {
            if (item.question) {
                resultMessage += `- ${item.question.replace('_____', `(${item.answer})`)}\n`;
            } else {
                resultMessage += `- ${item.word} (To'g'ri javob: ${item.category})\n`;
            }
        });
    }

    if (skippedCount > 0) {
        resultMessage += `Tashlab ketilgan so'zlar:\n`;
        ctx.session.skippedWords.forEach((item) => {
            if (item.question) {
                resultMessage += `- ${item.question.replace('_____', '_____')}\n`;
            } else {
                resultMessage += `- ${item.word}\n`;
            }
        });
    }

   await ctx.reply(resultMessage,
        Markup.keyboard([
            ['Gerund and infinitive (1 season)', 'Gerund and infinitive (2 season)']
        ]).oneTime().resize()
    );
}

bot.launch();

const app = express();
const port = process.env.PORT || 3000; // Default port for Render.com services

// Endpoint to respond to HTTP requests (for UptimeRobot)
app.get('/', (req, res) => {
    res.send('Bot is running...');
});

app.listen(port, () => {
    console.log(`Bot server is running on port ${port}`);
});

// Graceful shutdown
process.once('SIGINT', () => {
    if (bot && bot.stop) bot.stop('SIGINT');
});
process.once('SIGTERM', () => {
    if (bot && bot.stop) bot.stop('SIGTERM');
});

console.log('Bot is running...');
