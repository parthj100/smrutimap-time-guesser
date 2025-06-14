# SmrutiMap - Historical Image Guessing Game

SmrutiMap is an engaging web-based game where players guess the year and location of historical images. Test your knowledge of history and geography while exploring fascinating moments from the past!

## 🎮 Features

- **Historical Image Guessing**: Guess both the year (1900-2025) and location of historical photographs
- **Multiple Game Modes**: 
  - Random mode with shuffled images
  - Daily challenges
  - Timed gameplay options
- **Smart Image Pool System**: Ensures no duplicate images until all have been seen
- **User Authentication**: Create accounts to track progress and compete on leaderboards
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Real-time Scoring**: Advanced scoring system with time bonuses
- **Interactive Maps**: Google Maps integration for location guessing
- **Leaderboards**: Compete with other players across different game modes

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- A Supabase account and project
- Google Maps API key

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd time-trekker-dataset-quest
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your API keys:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:5173`

## 🛠️ Technology Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui components
- **Backend**: Supabase (PostgreSQL + Auth + Real-time)
- **Maps**: Google Maps JavaScript API
- **State Management**: React hooks + Context
- **Build Tool**: Vite
- **Deployment**: Ready for Vercel/Netlify

## 📁 Project Structure

```
src/
├── components/          # React components
│   ├── ui/             # Reusable UI components
│   ├── Game.tsx        # Main game component
│   ├── Home.tsx        # Landing page
│   └── ...
├── hooks/              # Custom React hooks
├── utils/              # Utility functions
├── constants/          # App constants and configuration
├── types/              # TypeScript type definitions
├── data/               # Sample data and helpers
└── integrations/       # External service integrations
```

## 🎯 Game Mechanics

### Scoring System
- **Year Accuracy**: Points based on how close your year guess is
- **Location Accuracy**: Points based on distance from actual location
- **Time Bonus**: Extra points for quick answers in timed modes
- **Maximum Score**: 10,000 points per round (5,000 year + 5,000 location)

### Image Pool System
- Each user gets a unique shuffled sequence of all available images
- No duplicates until all images have been seen
- Automatic pool reset when exhausted
- Cryptographically secure shuffling for fairness

## 🔧 Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript checks
```

### Code Quality

- **TypeScript**: Strict type checking enabled
- **ESLint**: Code linting with React and TypeScript rules
- **Prettier**: Code formatting (configure in your editor)
- **Error Boundaries**: Graceful error handling in production

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_SUPABASE_URL` | Your Supabase project URL | Yes |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anonymous key | Yes |
| `VITE_GOOGLE_MAPS_API_KEY` | Google Maps JavaScript API key | Yes |

### Database Setup

The app uses Supabase with the following main tables:
- `user_profiles` - User account information and statistics
- `game_sessions` - Individual game session records
- `round_results` - Results for each round within a session
- `user_image_pools` - Per-user image randomization state

## 🚀 Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Netlify

1. Build the project: `npm run build`
2. Deploy the `dist` folder to Netlify
3. Configure environment variables in Netlify dashboard

### Manual Deployment

1. Build the project: `npm run build`
2. Upload the `dist` folder to your web server
3. Configure your server to serve `index.html` for all routes (SPA)

## 🔒 Security Considerations

- API keys are properly configured as environment variables
- Row Level Security (RLS) enabled on Supabase tables
- Input validation on all user inputs
- Error boundaries prevent crashes from propagating
- HTTPS required for production deployment

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines

- Use TypeScript for all new code
- Follow the existing code style and patterns
- Add proper error handling and loading states
- Test your changes thoroughly
- Update documentation as needed

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Historical images sourced from various public archives
- Built with modern web technologies and best practices
- Inspired by geography and history education games

## 📞 Support

If you encounter any issues or have questions:

1. Check the existing GitHub issues
2. Create a new issue with detailed information
3. Include steps to reproduce any bugs
4. Provide your browser and OS information

---

**Happy guessing! 🎯📸**
