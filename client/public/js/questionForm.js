$(document).ready(function() {
    let currentSetIndex = 0; // Tracks the current index of the sub-question sets

    $('#questionForm').submit(function(e) {
        e.preventDefault(); // Prevents the default form submission action

        const questionText = $('#questionText').val(); // Gets the value of the textarea with id="questionText"

        console.log("Submitting question:", questionText); // Logging the question submission

        // AJAX POST request to '/api/question'
        $.ajax({
            url: '/api/question',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ questionText: questionText }), // Sends the question text as JSON in the request body
            success: function(response) {
                console.log("Received response:", response); // Logging successful response
                currentSetIndex = 0; // Reset index on new question submission
                displaySet(response.subQuestions, currentSetIndex); // Display the first set of sub-questions
                attachNavigationHandlers(response.subQuestions); // Attach handlers for navigation buttons
            },
            error: function(xhr, status, error) {
                console.error('Submission failed:', status, error);
                console.error('Detailed error:', xhr.responseText);
                $('#subQuestionsContainer').html(`<div class="alert alert-danger" role="alert">An error occurred: ${xhr.responseText || 'Error during submission'}</div>`);
            }
        });
    });

    function displaySet(subQuestionsSets, index) {
        // Clears the previous response
        $('#subQuestionsContainer').empty();

        const set = subQuestionsSets[index];
        let questionsHtml = '<ul class="list-group">';
        set.candidateSubquestions.forEach(subQuestion => {
            questionsHtml += `<li class="list-group-item">${subQuestion}</li>`;
        });
        questionsHtml += `</ul><p class="mt-3"><strong>Explanation:</strong> ${set.explanation}</p>`;

        $('#subQuestionsContainer').html(questionsHtml); // Inserts the generated HTML into the page
    }
});