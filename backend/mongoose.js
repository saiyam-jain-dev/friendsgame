const mongoose = require('mongoose');

const MONGO_URI = 'mongodb+srv://itzsamyy69_db_user:Itzsamyy69@cluster0.shokcht.mongodb.net/friendsgame?appName=Cluster0';

// User Schema (with embedded OTP verification fields)
const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  displayName: {
    type: String,
    default: null
  },
  otpCode: {
    type: String,
    default: null
  },
  otpExpiresAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Question Schema
const QuestionSchema = new mongoose.Schema({
  questionText: { type: String, required: true },
  optionA: { type: String, required: true },
  optionB: { type: String, required: true },
  optionC: { type: String, required: true },
  optionD: { type: String, required: true }
});

// GameHistory Schema
const GameHistorySchema = new mongoose.Schema({
  roomCode: { type: String, required: true },
  winnerName: { type: String, required: true },
  winnerScore: { type: Number, required: true },
  playersCount: { type: Number, required: true },
  playedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
const Question = mongoose.model('Question', QuestionSchema);
const GameHistory = mongoose.model('GameHistory', GameHistorySchema);

// Helper for seeding questions
async function seedQuestions() {
  const count = await Question.countDocuments();
  if (count === 0) {
    console.log('Seeding questions in MongoDB...');
    const seedData = [
      {
        questionText: "What is my absolute favorite way to spend a weekend?",
        optionA: "Sleeping in and doing absolutely nothing",
        optionB: "Going on an outdoor adventure or playing sports",
        optionC: "Gaming or binging movies for 12 hours straight",
        optionD: "Partying with friends until sunrise"
      },
      {
        questionText: "If I won 10 million dollars, what would I do first?",
        optionA: "Buy a luxury sports car and a mansion",
        optionB: "Invest it all and live off the interest",
        optionC: "Travel the world and never come back",
        optionD: "Quit my job/studies and throw a massive party"
      },
      {
        questionText: "What is my biggest pet peeve?",
        optionA: "Slow internet or lagging games",
        optionB: "People chewing loudly or making annoying sounds",
        optionC: "Getting texted 'K' or being left on read",
        optionD: "Messy rooms and unwashed dishes"
      },
      {
        questionText: "Which superpower would I choose if I could have one?",
        optionA: "Teleportation (skip all traffic and travel)",
        optionB: "Time Travel (fix mistakes or see the future)",
        optionC: "Mind Reading (know what everyone is thinking)",
        optionD: "Invisibility (perfect for spying and hiding)"
      },
      {
        questionText: "What kind of movie/show am I most likely to watch?",
        optionA: "Action/Sci-Fi full of CGI and explosions",
        optionB: "Comedy that makes me laugh out loud",
        optionC: "Horror/Thriller that keeps me on edge",
        optionD: "Rom-com or deep emotional drama"
      },
      {
        questionText: "What is my dream vacation destination?",
        optionA: "Relaxing on a tropical beach in Bali/Maldives",
        optionB: "Exploring historical streets in Kyoto/Rome",
        optionC: "Adventure hiking in Swiss Alps/New Zealand",
        optionD: "Shopping and partying in New York/Las Vegas"
      },
      {
        questionText: "Am I an early bird or a night owl?",
        optionA: "Early bird - I love productive mornings!",
        optionB: "Night owl - I thrive after midnight!",
        optionC: "Middle of the day - I hate both mornings and nights",
        optionD: "Always tired regardless of the hour"
      },
      {
        questionText: "If I could only eat one food for the rest of my life, what would it be?",
        optionA: "Pizza / Pasta (Carbs are life)",
        optionB: "Burgers and fries (Classic fast food)",
        optionC: "Sushi (Fresh and healthy)",
        optionD: "Tacos / Spicy Mexican food"
      },
      {
        questionText: "How do I handle stressful situations?",
        optionA: "Calmly analyze and solve the problem",
        optionB: "Panic silently and procrastinate",
        optionC: "Vent to my friends immediately",
        optionD: "Sleep it off and face it tomorrow"
      },
      {
        questionText: "What is my secret talent (or most likely one)?",
        optionA: "Remembering useless trivia and facts",
        optionB: "Cooking or baking masterclass dishes",
        optionC: "Being extremely good at video games",
        optionD: "Snoozing my alarm 10 times and still making it"
      },
      {
        questionText: "What is my go-to drink order?",
        optionA: "Ice-cold coffee / Red Bull (Need energy)",
        optionB: "Fizzy soda / Milkshake (Sweet tooth)",
        optionC: "Plain water / Herbal tea (Healthy life)",
        optionD: "Craft beer / Cocktail (Weekend vibes)"
      },
      {
        questionText: "What is my attitude towards text messages?",
        optionA: "Reply in 0.5 seconds flat",
        optionB: "Read it, reply in my head, forget to send",
        optionC: "Ignore it for days, then apologize",
        optionD: "Prefer calling or voice notes instead"
      }
    ];
    await Question.insertMany(seedData);
    console.log('MongoDB questions seeded successfully.');
  }
}

async function connectMongo() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Successfully connected to MongoDB Cluster.');
    await seedQuestions();
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  }
}

module.exports = {
  connectMongo,
  User,
  Question,
  GameHistory
};
