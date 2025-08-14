'use client'; 

import Link from "next/link";
import { motion } from "framer-motion";

export default function Home() {
  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-gray-900 to-purple-900 text-white p-4"
    >
      <div className="text-center max-w-2xl mx-auto">
        {/* Animated Title */}
        <motion.h1
          initial={{ y: -20 }}
          animate={{ y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-4xl md:text-6xl font-bold mb-6"
        >
          Welcome to Nemi
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-lg md:text-xl text-gray-300 mb-10"
        >
          Your personal AI assistant powered by LLaMA and ElevenLabs
        </motion.p>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Link
            href="/auth/login"
            className="inline-block px-8 py-3 rounded-lg bg-purple-600 hover:bg-purple-700 font-medium text-lg transition-colors shadow-lg"
          >
            Sign In
          </Link>
          
          <Link
            href="/auth/register"
            className="inline-block px-8 py-3 rounded-lg bg-gray-800 hover:bg-gray-700 font-medium text-lg transition-colors shadow-lg border border-gray-700"
          >
            Create Account
          </Link>
        </motion.div>
      </div>

      {/* Feature Highlights */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto"
      >
        {[
          {
            icon: '💬',
            title: 'Natural Chat',
            description: 'Conversations powered by AI'
          },
          {
            icon: '🔊', 
            title: 'Voice Responses',
            description: 'Hear answers with TTS'
          },
          {
            icon: '✅',
            title: 'Task Management',
            description: 'Track your todos with AI'
          }
        ].map((feature, index) => (
          <div 
            key={index}
            className="bg-gray-800/50 p-6 rounded-xl border border-gray-700"
          >
            <div className="text-3xl mb-3">{feature.icon}</div>
            <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
            <p className="text-gray-400">{feature.description}</p>
          </div>
        ))}
      </motion.div>

      {/* Footer */}
      <motion.footer 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="mt-16 text-gray-500 text-sm"
      >
        © {new Date().getFullYear()} Nemi AI Assistant
      </motion.footer>
    </motion.main>
  );
}