const express = require('express');
const Question = require('../models/Question');
const router = express.Router();

router.get('/api/questionData', async (req, res) => {
    try {
        // Fetching the latest question from the database
        const latestQuestion = await Question.findOne().sort({ _id: -1 });
        if (!latestQuestion) {
            console.log("No question found in the database.");
            return res.status(404).send("No question data available for visualization.");
        }

        // Transforming the question and its sub-questions into a format suitable for DAG visualization
        const transformToDAGFormat = (question) => {
            const root = { name: question.questionText, children: [], fullContent: question.questionText, _id: question._id };
            question.subQuestions.forEach((set, index) => {
                const setNode = { name: `Set ${index + 1}`, children: [], fullContent: `Set ${index + 1}`, explanation: set.explanation }; // No need for a unique _id for each set as it's not directly used
                set.candidateSubquestions.forEach(subQuestion => {
                    // Since sub-questions do not have their own _id, we simply use the question text for identification. This means no direct fetch based on _id for these.
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

module.exports = router;