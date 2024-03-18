document.addEventListener('DOMContentLoaded', function() {
    d3.select('#dagContainer').style('overflow', 'scroll'); // Setting overflow properties for scrolling

    const svg = d3.select("#dagVisualization");
    const width = document.getElementById('dagContainer').clientWidth;
    const height = document.getElementById('dagContainer').clientHeight; // Adjust height dynamically based on container size

    const renderDAG = (data, setIndex) => {
        if (!data || !data.children || data.children.length === 0 || !data.children[setIndex] || !data.children[setIndex].children) {
            console.error("Invalid or missing data for DAG visualization.");
            return;
        }

        const margin = { top: 20, right: 20, bottom: 20, left: 20 };
        const adjustedWidth = width - margin.right - margin.left;
        const adjustedHeight = height - margin.top - margin.bottom;

        const subQuestions = data.children[setIndex].children.map(sq => ({ name: sq.name.length > 20 ? sq.name.substring(0, 20) + '...' : sq.name, fullContent: sq.name }));
        const processedData = {
            name: data.name.length > 20 ? data.name.substring(0, 20) + '...' : data.name,
            children: subQuestions,
            fullContent: data.name,
            explanation: data.children[setIndex].explanation,
            _id: data._id
        };

        const root = d3.hierarchy(processedData, d => d.children);

        const depth = root.height;
        const breadth = root.leaves().length;
        const optimalHeight = Math.max(500, depth * 50, Math.min(breadth * 10, 800));
        const optimalWidth = adjustedWidth;
        const treeLayout = d3.tree().size([optimalWidth, optimalHeight]);

        svg.selectAll("*").remove();

        const updateLinks = () => {
            svg.selectAll(".link")
                .data(treeLayout(root).links())
                .join("path")
                .attr("class", "link")
                .attr("d", d3.linkVertical()
                    .x(d => d.x + margin.left)
                    .y(d => d.y + margin.top))
                .attr("fill", "none")
                .attr("stroke", "#555");
        };

        const updateNodes = () => {
            const node = svg.selectAll(".node")
                .data(root.descendants())
                .join("g")
                .attr("class", "node")
                .attr("transform", d => `translate(${d.x + margin.left},${d.y + margin.top})`);

            node.append("circle")
                .attr("r", 10)
                .attr("fill", d => d.children ? "#555" : "#999");

            node.append("text")
                .attr("dy", "0.31em")
                .attr("x", d => d.children ? -12 : 12)
                .style("text-anchor", d => d.children ? "end" : "start")
                .text(d => d.data.name)
                .clone(true).lower()
                .attr("stroke", "white");

            node.on("click", async (event, d) => {
                if (d.depth === 0) { // Checks if the clicked node is the main question
                    try {
                        const response = await fetch(`/api/question/${d.data._id}`);
                        if (!response.ok) throw new Error('Failed to fetch question details');
                        const questionDetails = await response.json();
                        $('#modalTitle').text('Main Question Details');
                        let modalBodyHtml = `<p>${questionDetails.questionText}</p>`;
                        questionDetails.subQuestions.forEach((set, index) => {
                            modalBodyHtml += `<br/><strong>Set ${index + 1}:</strong> <ul>`;
                            set.candidateSubquestions.forEach(subQuestion => {
                                modalBodyHtml += `<li>${subQuestion}</li>`;
                            });
                            modalBodyHtml += `</ul><p>${set.explanation}</p>`;
                        });
                        $('#modalBody').html(modalBodyHtml);
                        $('#detailsModal').modal('show');
                    } catch (error) {
                        console.error('Error fetching question details:', error);
                    }
                } else { // For sub-question nodes
                    $('#modalTitle').text('Sub-question Details');
                    let modalBodyHtml = `<p>${d.data.fullContent}</p>`;
                    if (d.data.explanation) {
                        modalBodyHtml += `<br/><p><strong>Explanation:</strong> ${d.data.explanation}</p>`;
                    }
                    $('#modalBody').html(modalBodyHtml);
                    $('#detailsModal').modal('show');
                }
            });
        };

        updateLinks();
        updateNodes();
    };

    // Fetching dynamic data using AJAX call to backend API
    $.ajax({
        url: '/api/questionData', // This endpoint fetches the question data for DAG visualization
        type: 'GET',
        success: function(response) {
            if (!response || !response.name || !response.children || response.children.length === 0) {
                console.error("Invalid or missing data from API for DAG visualization.");
                return;
            }
            console.log("Dynamic data fetched successfully:", response);

            // Listen for changes in set index triggered by navigationHandlers.js
            document.addEventListener('setIndexChanged', function(e) {
                const newIndex = e.detail.newIndex;
                if(newIndex !== undefined && newIndex >= 0 && newIndex < response.children.length) {
                    renderDAG(response, newIndex);
                }
            });

            // Initially render the first set of data
            renderDAG(response, 0);
        },
        error: function(xhr, status, error) {
            console.error('Error fetching dynamic data:', error.toString(), 'Status:', status, 'Response:', xhr.responseText);
        }
    });
});