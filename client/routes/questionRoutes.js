const express = require('express');
const router = express.Router();
const { generateSubquestions } = require('../utils/generateSubquestions');

const questionRoutes = (readDataFromFile, writeDataToFile) => {
  router.post('/api/question', (req, res) => {
    try {
      const { questionText } = req.body;
      if (!questionText) {
        console.log('Question text is required but not provided.');
        return res.status(400).send('Question text is required.');
      }

      const generatedData = generateSubquestions(questionText).map(set => ({
        candidateSubquestions: set.candidateSubquestions,
        explanation: set.explanation
      }));

      const data = readDataFromFile();
      const newQuestion = {
        _id: data.questions.length + 1,
        questionText,
        subQuestions: generatedData,
      };

      data.questions.push(newQuestion);
      writeDataToFile(data);

      console.log('New question saved:', newQuestion);
      res.status(201).json(newQuestion);
    } catch (error) {
      console.error('Error saving question:', error.message, error.stack);
      res.status(500).send('Failed to save question.');
    }
  });

  router.get('/api/question/:id', (req, res) => {
    try {
      const questionId = parseInt(req.params.id, 10);
      const data = readDataFromFile();
      const question = data.questions.find(q => q._id === questionId);

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

  router.get('/api/question/:id/set/:setIndex', (req, res) => {
    try {
      const questionId = parseInt(req.params.id, 10);
      const setIndex = parseInt(req.params.setIndex, 10);
      const data = readDataFromFile();
      const question = data.questions.find(q => q._id === questionId);

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

  return router;
};

module.exports = questionRoutes;
