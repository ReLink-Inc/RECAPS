const express = require('express');
const router = express.Router();
const Question = require('../models/Question'); // Import the Question model
const { generateSubquestions } = require('../utils/generateSubquestions'); // Import the function to generate subquestions

// POST handler for '/api/question'
router.post('/api/question', async (req, res) => {
  try {
    const { questionText } = req.body; // Extract questionText from request body
    if (!questionText) {
      console.log('Question text is required but not provided.');
      return res.status(400).send('Question text is required.');
    }

    // Call the generateSubquestions function to generate sub-questions and explanations
    const generatedData = generateSubquestions(questionText).map(set => ({
      candidateSubquestions: set.candidateSubquestions,
      explanation: set.explanation
    }));

    // Create a new question document with generated sub-questions and explanation
    const newQuestion = await Question.create({
      questionText,
      subQuestions: generatedData,
    });

    console.log('New question saved:', newQuestion); // Retaining this log for debugging purposes
    res.status(201).json(newQuestion); // Send the saved question object back to the client
  } catch (error) {
    console.error('Error saving question:', error.message, error.stack);
    res.status(500).send('Failed to save question.');
  }
});

// GET handler for '/api/question/:id'
router.get('/api/question/:id', async (req, res) => {
  try {
    const questionId = req.params.id;
    const question = await Question.findById(questionId);
    if (!question) {
      console.log(`Question with ID ${questionId} not found.`);
      return res.status(404).send('Question not found');
    }
    console.log(`Question with ID ${questionId} fetched successfully.`);
    res.json(question);
  } catch (error) {
    console.error(`Error fetching question details: ${error}`, error.stack);
    res.status(500).send('Error fetching question details');
  }
});

// New GET handler for fetching a question with a specific set of sub-questions
router.get('/api/question/:id/set/:setIndex', async (req, res) => {
  try {
    const questionId = req.params.id;
    const setIndex = parseInt(req.params.setIndex, 10);
    const question = await Question.findById(questionId);

    if (!question) {
      console.log(`Question with ID ${questionId} not found.`);
      return res.status(404).send('Question not found');
    }

    if (isNaN(setIndex) || setIndex < 0 || setIndex >= question.subQuestions.length) {
      console.log(`Invalid set index: ${setIndex}`);
      return res.status(400).send('Invalid set index');
    }

    const selectedSet = question.subQuestions[setIndex];
    console.log(`Sub-question set ${setIndex} for question with ID ${questionId} fetched successfully.`);
    res.json({ questionText: question.questionText, subQuestions: selectedSet.candidateSubquestions, explanation: selectedSet.explanation });
  } catch (error) {
    console.error(`Error fetching sub-question set: ${error}`, error.stack);
    res.status(500).send('Error fetching sub-question set');
  }
});

module.exports = router;