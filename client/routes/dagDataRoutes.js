const express = require('express');
const router = express.Router();

const dagDataRoutes = (readDataFromFile) => {
  router.get('/api/questionData', (req, res) => {
    try {
      const data = readDataFromFile();
      const latestQuestion = data.questions[data.questions.length - 1];

      if (!latestQuestion) {
        console.log("No question found.");
        return res.status(404).send("No question data available for visualization.");
      }

      const transformToDAGFormat = (question) => {
        const root = { name: question.questionText, children: [], fullContent: question.questionText, _id: question._id };
        question.subQuestions.forEach((set, index) => {
          const setNode = { name: `Set ${index + 1}`, children: [], fullContent: `Set ${index + 1}`, explanation: set.explanation };
          set.candidateSubquestions.forEach(subQuestion => {
            setNode.children.push({ name: subQuestion, fullContent: subQuestion });
          });
          root.children.push(setNode);
        });
        return root;
      };

      const dataForDAG = transformToDAGFormat(latestQuestion);
      console.log("Sending transformed question data for DAG visualization");
      res.json(dataForDAG);
    } catch (error) {
      console.error("Error fetching question data for DAG visualization:", error.message, error.stack);
      res.status(500).send("Failed to fetch question data for DAG visualization.");
    }
  });

  return router;
};

module.exports = dagDataRoutes;
