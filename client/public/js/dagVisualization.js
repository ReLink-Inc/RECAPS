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
        
        const margin = { top: 100, right: 700, bottom: 100, left: 200 };
        const optimalHeight = height - margin.top - margin.bottom;
        const optimalWidth = width - margin.right - margin.left;

        const subQuestions = data.children[setIndex].children.map(sq => ({ 
            name: sq.name, 
            fullContent: sq.name 
        }));
        const processedData = {
            name: data.name,
            children: subQuestions,
            fullContent: data.name,
            explanation: data.children[setIndex].explanation,
            _id: data._id
        };

        const root = d3.hierarchy(processedData, d => d.children);
        const treeLayout = d3.tree().size([optimalHeight, optimalWidth]);
        treeLayout(root);

        svg.selectAll("*").remove();

        const links = svg.selectAll(".link")
            .data(root.links())
            .enter().append("path")
            .attr("class", "link")
            .attr("d", d3.linkHorizontal()
                .x(d => d.y + margin.left)
                .y(d => d.x + margin.top))
            .attr("fill", "none")
            .attr("stroke", "#555");

        const nodes = svg.selectAll(".node")
            .data(root.descendants())
            .enter().append("g")
            .attr("class", "node")
            .attr("transform", d => `translate(${d.y + margin.left},${d.x + margin.top})`);

        nodes.append("text")
            .attr("dy", d => d.children ?"0.31em":"2em")
            .attr("x", d => d.children ? -5 : 15)
            .style("text-anchor", d => d.children ? "end" : "start")
            .text(d => d.children ? d.data.name :"0")
            // .call(wrapText, 560); // Apply text wrapping with max width of 100 pixels
        nodes.filter(d => !d.children).append("foreignObject")
            .attr("width", 600)
            .attr("height", 80)
            .style("text-anchor", d => d.children ? "end" : "start")
            .append("xhtml:div")
            .style("border", "1px solid black")
            .style("border-radius", "5px")
            .style("background", "#fff")
            .style("padding", "1px")
            .style("text-align", "center")
            .html(d => `<span>${d.data.name}</span>`);
        // Adding a rectangle around each text element
        nodes.each(function() {
            var node = d3.select(this),
                text = node.select("text"),
                bbox = text.node().getBBox();
            node.insert("rect", "text")
                .attr("x", bbox.x - 5)
                .attr("y", bbox.y - 5)
                .attr("width", bbox.width + 10)
                .attr("height", bbox.height + 10)
                .attr("fill", "none")
                .attr("stroke", "black")
                .attr("stroke-width", 1);
        });

        nodes.call(d3.drag()
            .on("start", function(event, d) {
                d3.select(this).raise().attr('stroke', 'black');
            })
            .on("drag", function(event, d) {
                d.x += event.dy;
                d.y += event.dx;
                d3.select(this).attr("transform", `translate(${d.y + margin.left},${d.x + margin.top})`);
                updateLinks();
            })
            .on("end", function(event, d) {
                d3.select(this).attr('stroke', null);
            }));

    nodes.on("click", async (event, d) => {
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

        function updateLinks() {
            svg.selectAll(".link")
                .attr("d", d3.linkHorizontal()
                    .x(d => d.y + margin.left)
                    .y(d => d.x + margin.top));
        }
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

    function wrapText(text, width) {
        text.each(function() {
            var text = d3.select(this),
                words = text.text().split(/\s+/).reverse(),
                word,
                line = [],
                lineNumber = 0,
                lineHeight = 1.1, // ems
                x = text.attr("x"),
                y = text.attr("y"),
                dy = parseFloat(text.attr("dy") || 0),
                tspan = text.text(null).append("tspan").attr("x", x).attr("y", y).attr("dy", dy + "em");

            while (word = words.pop()) {
                line.push(word);
                tspan.text(line.join(" "));
                if (tspan.node().getComputedTextLength() > width) {
                    line.pop();
                    tspan.text(line.join(" "));
                    line = [word];
                    tspan = text.append("tspan").attr("x", x).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
                }
            }
        });
    }
});
