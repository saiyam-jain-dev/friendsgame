const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb+srv://itzsamyy69_db_user:Itzsamyy69@cluster0.shokcht.mongodb.net/friendsgame?appName=Cluster0';

// User Schema (with embedded OTP verification fields)
const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    // unique: true,
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

// Helper for seeding flirty questions
async function seedQuestions() {
  console.log('Seeding flirty questions in MongoDB...');
  await Question.deleteMany({}); // Ensure fresh set of flirty questions
  const seedData = [
    {
      questionText: "What is your partner's dream romantic date night with you?",
      optionA: "Candlelit dinner with soft music & wine 🍷",
      optionB: "Late night drive with stargazing & deep talks 🌌",
      optionC: "Cozy movie night cuddling under a warm blanket 🛋️",
      optionD: "Spontaneous weekend getaway to a luxury beach resort 🏖️"
    },
    {
      questionText: "What turns your partner on the most?",
      optionA: "Deep eye contact and a gentle whisper in the ear 💋",
      optionB: "Unexpected tight hugs from behind 🤗",
      optionC: "Playful teasing & sarcastic flirting 😏",
      optionD: "Cute surprise gifts and romantic love notes 💌"
    },
    {
      questionText: "If your partner could steal a passionate kiss right now, where would it be?",
      optionA: "On the lips in the middle of a crowded room 💋",
      optionB: "Softly on the neck under dim lighting 🔥",
      optionC: "On the forehead with a sweet tender hold 🥰",
      optionD: "Playfully on the cheek while laughing together 😊"
    },
    {
      questionText: "What is your partner's secret flirty fantasy?",
      optionA: "A romantic midnight swim under the moonlit sky 🌙",
      optionB: "Breakfast in bed served with kisses & roses 🌹",
      optionC: "Dancing together in the rain with no cares 🌧️",
      optionD: "Getting dressed up for a classy secret date night 🍸"
    },
    {
      questionText: "How does your partner prefer to handle a romantic argument?",
      optionA: "Hug it out immediately & refuse to sleep angry 🤗",
      optionB: "Playfully tease until both break out laughing 😂",
      optionC: "Buy favorite snacks & apologize with cute puppy eyes 🥺",
      optionD: "Give a long passionate kiss to melt all worries 💋"
    },
    {
      questionText: "What kind of compliment makes your partner blush the hardest?",
      optionA: "'You look insanely attractive right now' 🔥",
      optionB: "'You have the most beautiful smile I've ever seen' 😍",
      optionC: "'I feel so lucky to have you in my life' 💕",
      optionD: "'You're so irresistible I can't focus on anything else' 😈"
    },
    {
      questionText: "What is your partner's favorite late-night craving together?",
      optionA: "Late night pizza & ice cream binge 🍕🍦",
      optionB: "Deep meaningful pillow talks until sunrise 🌅",
      optionC: "Binge-watching a romantic thriller series 🍿",
      optionD: "Playful midnight adventure or long drive 🚘"
    },
    {
      questionText: "If you and your partner had 24 hours with no rules, what would you do first?",
      optionA: "Pack bags & fly to a secret tropical island ✈️",
      optionB: "Spend all day cuddled in bed ordering room service 🛏️",
      optionC: "Rent a luxury penthouse & throw a private two-person party 🥂",
      optionD: "Go on a wild spontaneous road trip to nowhere 🗺️"
    },
    {
      questionText: "What is your partner's absolute favorite way to be comforted?",
      optionA: "Long warm back rubs & hair stroking 💆‍♂️",
      optionB: "Holding hands tightly without needing any words 🤝",
      optionC: "Listening to them vent while giving sweet forehead kisses 😘",
      optionD: "Making them their favorite hot drink & wrapping them in a blanket ☕"
    },
    {
      questionText: "What is your partner's biggest weakness when flirting?",
      optionA: "Winking with a confident sly smile 😉",
      optionB: "Biting their lip while looking you up and down 👄",
      optionC: "Getting super cute & shy when complimented 🥰",
      optionD: "Whispering secret jokes in your ear in public 🤫"
    },
    {
      questionText: "What soundtrack best describes your romantic vibe together?",
      optionA: "Slow sensual R&B and jazz beats 🎷",
      optionB: "Energetic pop & fun dance anthems 🎵",
      optionC: "Acoustic indie love songs around a bonfire 🎸",
      optionD: "Retro 80s synthwave for late night drives 🌃"
    },
    {
      questionText: "What is your partner's favorite physical affection?",
      optionA: "Interlocking fingers while walking together 👫",
      optionB: "Resting their head on your shoulder or chest 💤",
      optionC: "Playful steals of kisses throughout the day 💋",
      optionD: "Warm tight bear hugs that lift them off their feet 🐻"
    },
    {
      questionText: "If your partner had to describe your chemistry in one word, what would it be?",
      optionA: "Electric ⚡",
      optionB: "Intoxicating 🍷",
      optionC: "Comforting 🧸",
      optionD: "Wild 💥"
    },
    {
      questionText: "What is your partner's ideal lazy Sunday with you?",
      optionA: "Sleeping in till noon & eating brunch in pajamas 🥞",
      optionB: "Binging Netflix movies while sharing a single blanket 🎬",
      optionC: "Taking a slow stroll in the park holding hands 🌳",
      optionD: "Cooking a delicious meal together while playing music 👩‍🍳"
    },
    {
      questionText: "What flirty nickname would your partner secretly love to hear you call them?",
      optionA: "'Gorgeous' / 'Handsome' ✨",
      optionB: "'My Favorite Distraction' 😈",
      optionC: "'Angel' / 'Sweetheart' 😇",
      optionD: "'Trouble' / 'Partner in Crime' 🕵️‍♂️"
    }
  ];
  await Question.insertMany(seedData);
  console.log('MongoDB flirty questions seeded successfully.');
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
