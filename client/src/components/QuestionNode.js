// In QuestionNode.js
import React from 'react';
import NavigationButtons from './NavigationButtons';

function QuestionNode({ question, onNavigate }) {
  return (
    <div className="question-node">
      <div className="question-text">{question.text}</div>
      <NavigationButtons onNavigate={onNavigate} />
      {/* Render sub-questions if they exist */}
      {question.subQuestions && question.subQuestions.map(subQuestion =>
        <QuestionNode key={subQuestion.id} question={subQuestion} onNavigate={onNavigate} />
      )}
    </div>
  );
}

export default QuestionNode;