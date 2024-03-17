// In QuestionTree.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import QuestionNode from './QuestionNode';

function QuestionTree() {
  const [questions, setQuestions] = useState([]);

  useEffect(() => {
    // Load initial questions from the backend
    const fetchQuestions = async () => {
      const result = await axios('/api/questions'); // Adjust the URL as needed
      setQuestions(result.data.questions);
    };
    fetchQuestions();
  }, []);

  const handleNavigate = (questionId, direction) => {
    // Logic to update the question based on navigation
    // This might involve fetching new sub-questions from the backend
    // and updating the state accordingly
  };

  return (
    <div className="question-tree">
      {questions.map(question =>
        <QuestionNode key={question.id} question={question} onNavigate={handleNavigate} />
      )}
    </div>
  );
}

export default QuestionTree;