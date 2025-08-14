"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";

interface NewsArticle {
  title: string;
  source: string;
  url: string;
}

interface NewsRequest {
  topic: string;
  country: string;
  keywords?: string;
}

interface WeatherData {
  location: string;
  temperature: number;
  conditions: string;
  humidity: number;
  wind_speed: number;
}

interface LocationRequest {
  city: string;
  country_code?: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  
  // News states
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsError, setNewsError] = useState("");
  const [searchParams, setSearchParams] = useState<NewsRequest>({
    topic: "general",
    country: "us",
    keywords: ""
  });

  // Weather states
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState("");
  const [locationInput, setLocationInput] = useState<LocationRequest>({
    city: "",
    country_code: ""
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    
    if (!token) {
      router.push("/auth/login");
      return;
    }

    // Decode JWT to get username
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setUsername(payload.sub || "User");
    } catch (err) {
      console.error("Failed to decode token:", err);
      setUsername("User");
    } finally {
      setIsLoading(false);
    }

    // Fetch initial data
    fetchNews();
    fetchWeather({ city: "New York" }); // Default location
  }, [router]);

  // News functions
  const fetchNews = async (params: NewsRequest = searchParams) => {
    setNewsLoading(true);
    setNewsError("");
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/news", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(params)
      });

      if (!response.ok) {
        throw new Error("Failed to fetch news");
      }

      const data = await response.json();
      setNews(data.articles);
    } catch (err) {
      console.error("News fetch error:", err);
      setNewsError("Failed to load news. Please try again later.");
    } finally {
      setNewsLoading(false);
    }
  };

  const handleNewsSearchChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setSearchParams(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleNewsSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchNews();
  };

  // Weather functions
  const fetchWeather = async (location: LocationRequest) => {
    setWeatherLoading(true);
    setWeatherError("");
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/weather", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(location)
      });

      if (!response.ok) {
        throw new Error("Failed to fetch weather");
      }

      const data = await response.json();
      setWeather(data);
    } catch (err) {
      console.error("Weather fetch error:", err);
      setWeatherError("Failed to load weather data. Please try again.");
    } finally {
      setWeatherLoading(false);
    }
  };

  const handleWeatherInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLocationInput(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleWeatherSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (locationInput.city.trim()) {
      fetchWeather(locationInput);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-950 text-white"
    >
      <div className="container mx-auto px-4 py-12">
        <motion.div
          initial={{ y: -20 }}
          animate={{ y: 0 }}
          className="max-w-2xl mx-auto text-center mb-12"
        >
          <h1 className="text-4xl font-bold mb-2">
            Welcome, <span className="text-purple-400">{username}</span> 👋
          </h1>
          <p className="text-gray-400">Manage your tasks and stay updated</p>
        </motion.div>

        {/* Top Cards Grid - 3 columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto mb-12">
  {/* Weather Card - now with more width */}
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.1 }}
    className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 backdrop-blur-sm min-h-[300px] flex flex-col"
  >
    <div className="flex justify-between items-center mb-4">
      <h2 className="text-2xl font-semibold">Weather</h2>
      <button
        onClick={() => weather && fetchWeather(locationInput)}
        disabled={weatherLoading}
        className="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
      >
        {weatherLoading ? "Refreshing..." : "Refresh"}
      </button>
    </div>

    <form onSubmit={handleWeatherSubmit} className="mb-4 space-y-3 flex-grow">
      <div className="space-y-3">
        <div>
          <label htmlFor="city" className="block text-sm font-medium text-gray-300 mb-1">
            City
          </label>
          <input
            type="text"
            name="city"
            value={locationInput.city}
            onChange={handleWeatherInputChange}
            placeholder="Enter city"
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            required
          />
        </div>
        
        <div>
          <label htmlFor="country_code" className="block text-sm font-medium text-gray-300 mb-1">
            Country Code (optional)
          </label>
          <input
            type="text"
            name="country_code"
            value={locationInput.country_code || ""}
            onChange={handleWeatherInputChange}
            placeholder="e.g., US, GB"
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        
        <button
          type="submit"
          disabled={weatherLoading}
          className="w-full mt-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          Get Weather
        </button>
      </div>

      {weatherError && (
        <div className="text-red-400">{weatherError}</div>
      )}
    </form>

    {weatherLoading && !weather ? (
      <div className="flex justify-center items-center flex-grow">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    ) : weather ? (
      <div className="space-y-2 mt-auto">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-medium">{weather.location}</h3>
          <span className="text-2xl font-bold">{weather.temperature}°C</span>
        </div>
        <div className="flex justify-between text-gray-300">
          <span>Conditions: {weather.conditions}</span>
        </div>
        <div className="flex justify-between text-gray-300">
          <span>Humidity: {weather.humidity}%</span>
          <span>Wind: {weather.wind_speed} m/s</span>
        </div>
      </div>
    ) : (
      <div className="text-center py-4 text-gray-400 mt-auto">
        Enter location to see weather
      </div>
    )}
  </motion.div>

  {/* Task Manager Card */}
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.2 }}
    className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 backdrop-blur-sm min-h-[300px] flex flex-col"
  >
    <div className="text-3xl mb-3">✅</div>
    <h3 className="text-xl font-semibold mb-2">Task Manager</h3>
    <p className="text-gray-400 mb-4">Create and organize your tasks</p>
    <div className="mt-auto">
      <Link
        href="/tasks"
        className="bg-blue-600 hover:bg-blue-700 inline-block px-6 py-2 rounded-lg font-medium transition-colors"
      >
        Open
      </Link>
    </div>
  </motion.div>

  {/* AI Assistant Card */}
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.3 }}
    className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 backdrop-blur-sm min-h-[300px] flex flex-col"
  >
    <div className="text-3xl mb-3">💬</div>
    <h3 className="text-xl font-semibold mb-2">AI Assistant</h3>
    <p className="text-gray-400 mb-4">Chat with your personal assistant</p>
    <div className="mt-auto">
      <Link
        href="/assistant"
        className="bg-green-600 hover:bg-green-700 inline-block px-6 py-2 rounded-lg font-medium transition-colors"
      >
        Open
      </Link>
    </div>
  </motion.div>
</div>
        {/* News Section - Full width below the cards */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="max-w-6xl mx-auto bg-gray-800/50 border border-gray-700 rounded-xl p-6 backdrop-blur-sm"
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold">Latest News</h2>
            <button
              onClick={() => fetchNews()}
              disabled={newsLoading}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {newsLoading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          <form onSubmit={handleNewsSearchSubmit} className="mb-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="topic" className="block text-sm font-medium text-gray-300 mb-1">
                  Topic
                </label>
                <select
                  id="topic"
                  name="topic"
                  value={searchParams.topic}
                  onChange={handleNewsSearchChange}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="general">General</option>
                  <option value="technology">Technology</option>
                  <option value="business">Business</option>
                  <option value="sports">Sports</option>
                  <option value="entertainment">Entertainment</option>
                  <option value="health">Health</option>
                  <option value="science">Science</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="country" className="block text-sm font-medium text-gray-300 mb-1">
                  Country
                </label>
                <select
                  id="country"
                  name="country"
                  value={searchParams.country}
                  onChange={handleNewsSearchChange}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="us">United States</option>
                  <option value="gb">United Kingdom</option>
                  <option value="ca">Canada</option>
                  <option value="au">Australia</option>
                  <option value="in">India</option>
                  <option value="jp">Japan</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="keywords" className="block text-sm font-medium text-gray-300 mb-1">
                  Keywords
                </label>
                <div className="flex">
                  <input
                    type="text"
                    id="keywords"
                    name="keywords"
                    value={searchParams.keywords}
                    onChange={handleNewsSearchChange}
                    placeholder="e.g., AI, Bitcoin"
                    className="flex-1 bg-gray-700 border border-gray-600 rounded-l-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <button
                    type="submit"
                    disabled={newsLoading}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-r-lg font-medium transition-colors disabled:opacity-50"
                  >
                    Search
                  </button>
                </div>
              </div>
            </div>
          </form>

          {newsError && (
            <div className="text-red-400 mb-4">{newsError}</div>
          )}

          {newsLoading && !news.length ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
            </div>
          ) : news.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              No news found. Try different search parameters.
            </div>
          ) : (
            <div className="space-y-4">
              {news.map((article, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-4 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-colors"
                >
                  <h3 className="font-medium text-lg mb-1">{article.title}</h3>
                  <p className="text-gray-400 text-sm mb-2">{article.source}</p>
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-400 hover:text-purple-300 text-sm"
                  >
                    Read more →
                  </a>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-12 text-center"
        >
          <button
            onClick={() => {
              localStorage.removeItem("token");
              router.push("/auth/login");
            }}
            className="px-6 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors"
          >
            Sign Out
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
}