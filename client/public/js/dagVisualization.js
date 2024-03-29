document.addEventListener('DOMContentLoaded', function() {
    d3.select('#dagContainer').style('overflow', 'scroll');

    const svg = d3.select("#dagVisualization");
    const width = document.getElementById('dagContainer').clientWidth;
    const height = document.getElementById('dagContainer').clientHeight;

    const renderDAG = (data, setIndex) => {
        if (!data || !data.children || data.children.length === 0 || !data.children[setIndex] || !data.children[setIndex].children) {
            console.error("Invalid or missing data for DAG visualization.");
            return;
        }
        
        const margin = { top: 20, right: 20, bottom: 20, left: 20 };
        const adjustedWidth = width - margin.right - margin.left;
        const adjustedHeight = height - margin.top - margin.bottom;

        const subQuestions = data.children[setIndex].children.map(sq => ({ 
            name: sq.name,//sq.name.length > 20 ? sq.name.substring(0, 20) + '...' : sq.name, 
            fullContent: sq.name 
        }));
        const processedData = {
            name: data.name,//data.name.length > 20 ? data.name.substring(0, 20) + '...' : data.name,
            children: subQuestions,
            fullContent: data.name,
            explanation: data.children[setIndex].explanation,
            _id: data._id
        };

        const root = d3.hierarchy(processedData, d => d.children);
        const depth = root.height;
        const breadth = root.leaves().length;
        const optimalHeight = adjustedHeight;
        const optimalWidth = Math.max(400, depth * 100, Math.min(breadth * 15, 1200));

        const treeLayout = d3.tree().size([optimalHeight, optimalWidth]);

        svg.selectAll("*").remove();

        const updateLinks = () => {
            svg.selectAll(".link")
                .data(treeLayout(root).links())
                .join("path")
                .attr("class", "link")
                .attr("d", d3.linkHorizontal()
                    .x(d => d.y + margin.left)
                    .y(d => d.x + margin.top))
                .attr("fill", "none")
                .attr("stroke", "#555");
        };

        const updateNodes = () => {
            const node = svg.selectAll(".node")
                .data(root.descendants())
                .join("g")
                .attr("class", "node")
                .attr("transform", d => `translate(${d.y + margin.left},${d.x + margin.top})`);

            node.filter(d => !d.children).append("foreignObject")
                .attr("width", 500)
                .attr("height", 100)
                .append("xhtml:div")
                .style("border", "1px solid black")
                .style("border-radius", "5px")
                .style("background", "#fff")
                .style("padding", "10px")
                .style("text-align", "center")
                .html(d => `<span>${d.data.name}</span>`);

            node.filter(d => d.children).append("circle")
                .attr("r", 10)
                .attr("fill", "#555");

            node.filter(d => d.children).append("text")
                .attr("dy", "0.31em")
                .attr("x", -12)
                .style("text-anchor", "end")
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

    $.ajax({
        url: '/api/questionData',
        type: 'GET',
        success: function(response) {
            if (!response || !response.name || !response.children || response.children.length === 0) {
                console.error("Invalid or missing data from API for DAG visualization.");
                return;
            }
            console.log("Dynamic data fetched successfully:", response);

            document.addEventListener('setIndexChanged', function(e) {
                const newIndex = e.detail.newIndex;
                if(newIndex !== undefined && newIndex >= 0 && newIndex < response.children.length) {
                    renderDAG(response, newIndex);
                }
            });

            renderDAG(response, 0);
        },
        error: function(xhr, status, error) {
            console.error('Error fetching dynamic data:', error.toString(), 'Status:', status, 'Response:', xhr.responseText);
        }
    });

});
