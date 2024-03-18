const mongoose = require('mongoose');

// Define the schema for a question
const questionSchema = new mongoose.Schema({
  questionText: { type: String, required: true },
  // Modified to include unique identifiers for each set of sub-questions
  subQuestions: [{
    _id: { type: mongoose.Schema.Types.ObjectId, default: () => new mongoose.Types.ObjectId() },
    candidateSubquestions: [String],
    explanation: String
  }],
  // Preserve the original 'explanation' field for a general explanation of the main question
  explanation: String,
});

// Compile and export the model
const Question = mongoose.model('Question', questionSchema);
module.exports = Question;