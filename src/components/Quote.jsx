// src/components/DailyQuote.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/Quote.css';

const DailyQuote = () => {
  const [quote, setQuote] = useState(null);

  useEffect(() => {
    const fetchQuote = async () => {
      try {
        const response = await axios.get('http://localhost:8000/api/daily-quote/');
        setQuote(response.data);
      } catch (error) {
        console.error('Error fetching daily quote:', error);
      }
    };

    fetchQuote();
  }, []);

  if (!quote) {
    return <div>Loading...</div>;
  }

  return (
    <div className="daily-quote-card">
      <blockquote>
        <p>"{quote.text}"</p>
        <footer>
          — {quote.author}, <cite>{quote.book}</cite>
        </footer>
      </blockquote>
    </div>
  );
};

export default DailyQuote;