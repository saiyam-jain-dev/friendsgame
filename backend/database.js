const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'database.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Database connection failed:', err.message);
  } else {
    console.log('Connected to SQLite database.');
  }
});

// Helper for running queries with promises
const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

const dbAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const dbGet = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

// Initialize database schema
async function initDb() {
  // Users table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Questions table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question_text TEXT NOT NULL,
      option_a TEXT NOT NULL,
      option_b TEXT NOT NULL,
      option_c TEXT NOT NULL,
      option_d TEXT NOT NULL
    )
  `);

  // Game History table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS game_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_code TEXT NOT NULL,
      winner_name TEXT NOT NULL,
      winner_score INTEGER NOT NULL,
      players_count INTEGER NOT NULL,
      played_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Check if questions are already seeded
  const rowCount = await dbGet('SELECT COUNT(*) as count FROM questions');
  if (rowCount.count === 0) {
    console.log('Seeding initial questions...');
    const seedQuestions = [
      {
        q: "What is my absolute favorite way to spend a weekend?",
        a: "Sleeping in and doing absolutely nothing",
        b: "Going on an outdoor adventure or playing sports",
        c: "Gaming or binging movies for 12 hours straight",
        d: "Partying with friends until sunrise"
      },
      {
        q: "If I won 10 million dollars, what would I do first?",
        a: "Buy a luxury sports car and a mansion",
        b: "Invest it all and live off the interest",
        c: "Travel the world and never come back",
        d: "Quit my job/studies and throw a massive party"
      },
      {
        q: "What is my biggest pet peeve?",
        a: "Slow internet or lagging games",
        b: "People chewing loudly or making annoying sounds",
        c: "Getting texted 'K' or being left on read",
        d: "Messy rooms and unwashed dishes"
      },
      {
        q: "Which superpower would I choose if I could have one?",
        a: "Teleportation (skip all traffic and travel)",
        b: "Time Travel (fix mistakes or see the future)",
        c: "Mind Reading (know what everyone is thinking)",
        d: "Invisibility (perfect for spying and hiding)"
      },
      {
        q: "What kind of movie/show am I most likely to watch?",
        a: "Action/Sci-Fi full of CGI and explosions",
        b: "Comedy that makes me laugh out loud",
        c: "Horror/Thriller that keeps me on edge",
        d: "Rom-com or deep emotional drama"
      },
      {
        q: "What is my dream vacation destination?",
        a: "Relaxing on a tropical beach in Bali/Maldives",
        b: "Exploring historical streets in Kyoto/Rome",
        c: "Adventure hiking in Swiss Alps/New Zealand",
        d: "Shopping and partying in New York/Las Vegas"
      },
      {
        q: "Am I an early bird or a night owl?",
        a: "Early bird - I love productive mornings!",
        b: "Night owl - I thrive after midnight!",
        c: "Middle of the day - I hate both mornings and nights",
        d: "Always tired regardless of the hour"
      },
      {
        q: "If I could only eat one food for the rest of my life, what would it be?",
        a: "Pizza / Pasta (Carbs are life)",
        b: "Burgers and fries (Classic fast food)",
        c: "Sushi (Fresh and healthy)",
        d: "Tacos / Spicy Mexican food"
      },
      {
        q: "How do I handle stressful situations?",
        a: "Calmly analyze and solve the problem",
        b: "Panic silently and procrastinate",
        c: "Vent to my friends immediately",
        d: "Sleep it off and face it tomorrow"
      },
      {
        q: "What is my secret talent (or most likely one)?",
        a: "Remembering useless trivia and facts",
        b: "Cooking or baking masterclass dishes",
        c: "Being extremely good at video games",
        d: "Snoozing my alarm 10 times and still making it"
      },
      {
        q: "What is my go-to drink order?",
        a: "Ice-cold coffee / Red Bull (Need energy)",
        b: "Fizzy soda / Milkshake (Sweet tooth)",
        c: "Plain water / Herbal tea (Healthy life)",
        d: "Craft beer / Cocktail (Weekend vibes)"
      },
      {
        q: "What is my attitude towards text messages?",
        a: "Reply in 0.5 seconds flat",
        b: "Read it, reply in my head, forget to send",
        c: "Ignore it for days, then apologize",
        d: "Prefer calling or voice notes instead"
      }
    ];

    for (const q of seedQuestions) {
      await dbRun(
        'INSERT INTO questions (question_text, option_a, option_b, option_c, option_d) VALUES (?, ?, ?, ?, ?)',
        [q.q, q.a, q.b, q.c, q.d]
      );
    }
    console.log('Seeded successfully.');
  }
}

module.exports = {
  db,
  dbRun,
  dbGet,
  dbAll,
  initDb
};
