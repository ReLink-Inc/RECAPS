document.addEventListener('DOMContentLoaded', function() {
    d3.select('#dagContainer').style('overflow', 'scroll');

    const svg = d3.select("#dagVisualization");
    const width = document.getElementById('dagContainer').clientWidth;
    const height = document.getElementById('dagContainer').clientHeight;

    let currentData;
    let currentIndex;

    const renderDAG = (data, setIndex) => {
        currentData = data; // Store current data for access in addSubQuestion
        currentIndex = setIndex; // Store current index for access in addSubQuestion
        if (!data || !data.children || data.children.length === 0 || !data.children[setIndex] || !data.children[setIndex].children) {
            console.error("Invalid or missing data for DAG visualization.");
            return;
        }
        
        const margin = { top: 50, right: 800, bottom: 100, left: 100 };
        const optimalHeight = height - margin.top - margin.bottom;
        const optimalWidth = width - margin.right - margin.left;

        const subQuestions = data.children[setIndex].children.map((sq, index) => ({
            name: sq.name,
            fullContent: sq.name,
            index: index  // Keep track of the index for deletion
        }));

        subQuestions.push({ name: "", fullContent: "", isNew: true }); // Placeholder for new subquestion
        
        const processedData = {
            name: data.name,
            children: subQuestions,
            fullContent: data.name,
            explanation: data.children[setIndex].explanation,
            _id: data._id
        };

        const root = d3.hierarchy(processedData, d => d.children);
        const depth = root.height;
        const breadth = root.leaves().length;
        // const optimalWidth = Math.max(400, depth * 100, Math.min(breadth * 15, 1200));
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


        // nodes.append("foreignObject")
        //     .attr("width", d => d.children ? 300 : 500)  // Different width for main question and sub-questions
        //     .attr("height", 100) // Fixed height; adjust as necessary
        //     .append("xhtml:body") // Using xhtml:body to ensure styles are scoped to the foreignObject
        //     .style("margin", "0") // Removing default margin
        //     .append("textarea")
        //     .attr("rows", 3)
        //     .attr("cols", d => d.children ? 50 : 80) // Different column size for main question and sub-questions
        //     .style("width", "100%") // Ensuring textarea takes full width of foreignObject
        //     .style("height", "100%") // Ensuring textarea takes full height of foreignObject
        //     .text(d => d.data.name); // Initial text is the node's name
        


        nodes.filter(d => d.children).append("text")
            .attr("dy", "0.31em")
            .attr("x", d => d.children ? -2 : 2)
            .style("text-anchor", d => d.children ? "end" : "start")
            .text(d => d.data.name)
            .each(function(d) {
                var bbox = this.getBBox(); // 获取文本的 bounding box
                var padding = 20; // 设置边距

                // 在文本之前插入 rect 元素
                d3.select(this.parentNode).insert("rect", "text")
                    .attr("x", bbox.x - padding)
                    .attr("y", bbox.y - padding)
                    .attr("width", bbox.width + 2*padding)
                    .attr("height", bbox.height + 2*padding)
                    .style("fill", "white")
                    .style("stroke", "black");
            });

            
        //  // this code snippet will add subquestions and let links connect to upper left corner of the subquestions
        // nodes.filter(d => !d.children).append("foreignObject")
        //     .attr("width", 500)
        //     .attr("height", 50)
        //     .attr("y", -25)  //2 lines = 50?
        //     .append("xhtml:div")
        //     .style("border", "1px solid black")
        //     .style("border-radius", "5px")
        //     .style("background", "#fff")
        //     .style("padding", "0px")
        //     .style("text-align", "center")
        //     .html(d => `<span>${d.data.name}</span>`);



        // For subquestions, use a textarea inside a foreignObject for editing
        nodes.filter(d => !d.children).each(function(d) {
            const nodeGroup = d3.select(this);
            nodeGroup.append("foreignObject")
                .attr("width", 500)
                .attr("height", 100)
                .attr("y", -25)
                .append("xhtml:div")
                .style("border", "1px solid black")
                .style("border-radius", "5px")
                .style("background", "#fff")
                .style("padding", "0px")
                .style("text-align", "center")
                .append("xhtml:textarea")
                .attr("style", "width:100%; height:100%; border:none; outline:none; resize:none; background-color: white; padding-left: 50px;")
                .html(d => d.data.fullContent);

            // Append a button to add new linked textareas
            nodeGroup.append("foreignObject")
                .attr("width", 30)
                .attr("height", 30)
                .attr("x", 510) // Position next to the textarea
                .attr("y", -15)
                .append("xhtml:button")
                .style("width", "100%")
                .style("height", "100%")
                .text("+")
                .on("click", () => addLinkedTextarea(d, nodeGroup));
        });
        





            
        // Append "x" delete button for each subquestion
        nodes.filter(d => !d.children).append("foreignObject")
            .attr("width", 50)
            .attr("height", 50)
            .attr("y", -25)
            .append("xhtml:button")
            .attr("style", "width:50%; height:50%; color: red;")
            .text("x")
            .on("click", function(event, d) {
                deleteSubQuestion(d.data.index);
                event.stopPropagation();  // Prevent triggering click on the entire node
            });



            

        // Append the "More Subquestions" button below the last subquestion
        nodes.filter(d => d.data.isNew).append("foreignObject")
            .attr("width", 200)
            .attr("height", 50)
            .attr("y", 35)
            .append("xhtml:button")
            .attr("style", "width:100%; height:100%;")
            .text("More Subquestions")
            .on("click", function(event, d) {
                addSubQuestion(setIndex);
            });


        // Add event listener for double-clicking on nodes to show details
        nodes.on("dblclick", async (event, d) => {
            if (d.depth === 0) { // Checks if the clicked node is the main question
                try {
                    const response = await fetch(`/api/question/${d.data._id}`);
                    if (!response.ok) throw new Error('Failed to fetch question details');
                    const questionDetails = await response.json();
                    $('#modalTitle').text('Main Question Details');
                    let modalBodyHtml = `<p>${questionDetails.questionText}</p>`;
                    questionDetails.subQuestions.forEach((set, index) => {
                        // Arrow is now to the left of the set label and removed the colon
                        modalBodyHtml += `<div class='subquestion-set-header' style='cursor:pointer;'><strong><span class='arrow'>&rarr;</span> Set ${index + 1}</strong></div>`;
                        // Subquestions and explanations are initially hidden
                        modalBodyHtml += `<div class='subquestion-set-content' style='display:none;'><ul>`;
                        set.candidateSubquestions.forEach(subQuestion => {
                            modalBodyHtml += `<li>${subQuestion}</li>`;
                        });
                        modalBodyHtml += `</ul><p>${set.explanation}</p></div>`;
                    });
                    $('#modalBody').html(modalBodyHtml);
                    $('#detailsModal').modal('show');
        
                    // Toggle visibility of each set's content and change arrow direction
                    $('.subquestion-set-header').click(function() {
                        $(this).next('.subquestion-set-content').toggle();
                        // Change the arrow direction based on visibility
                        $(this).find('.arrow').html($(this).next('.subquestion-set-content').is(':visible') ? '&darr;' : '&rarr;');
                    });
                } catch (error) {
                    console.error('Error fetching question details:', error);
                }
            }
            else { // For sub-question nodes
                $('#modalTitle').text('Sub-question Details');
                let modalBodyHtml = `<p>${d.data.fullContent}</p>`;
                if (d.data.explanation) {
                    modalBodyHtml += `<br/><p><strong>Explanation:</strong> ${d.data.explanation}</p>`;
                }
                $('#modalBody').html(modalBodyHtml);
                $('#detailsModal').modal('show');
            }
        });


        const dragNode = d3.drag()
            .on("start", function(event, d) {
                d3.select(this).raise().attr('stroke', 'black');
                d.x0 = event.x;
                d.y0 = event.y;
            })
            .on("drag", function(event, d) {
                d.x += event.y - d.y0;
                d.y += event.x - d.x0;
                d.x0 = event.x;
                d.y0 = event.y;
                d3.select(this)
                .attr("transform", `translate(${d.y + margin.left},${d.x + margin.top})`);
                updateLinks();
            })
            .on("end", function(event, d) {
                d3.select(this).attr('stroke', null);
            });

        const dragLink = d3.drag()
            .on("start", function(event, d) {
                d3.select(this).raise().classed("active", true);
            })
            .on("drag", function(event, d) {
                d.source.x += event.dx;
                d.source.y += event.dy;
                updateLinks();
            })
            .on("end", function(event, d) {
                d3.select(this).classed("active", false);
            });

        nodes.call(dragNode);
        links.call(dragLink);

        function updateLinks() {
            svg.selectAll(".link")
                .attr("d", d3.linkHorizontal()
                    .x(d => d.y + margin.left)
                    .y(d => d.x + margin.top));
        }
    };

    function addSubQuestion(setIndex) {
        const newSubQuestion = { name: "", fullContent: "" };
        currentData.children[setIndex].children.push(newSubQuestion);
        renderDAG(currentData, setIndex); // Re-render DAG with new subquestion
    }
    function deleteSubQuestion(index) {
        currentData.children[currentIndex].children.splice(index, 1);
        renderDAG(currentData, currentIndex);
    }

    function addLinkedTextarea(nodeData, nodeGroup) {
        // Example of manually adding a linked textarea
        nodeGroup.append("foreignObject")
            .attr("width", 500)
            .attr("height", 100)
            .attr("x", 540) // Position next to the button
            .attr("y", -25)
            .append("xhtml:div")
            .style("border", "1px solid black")
            .style("border-radius", "5px")
            .style("background", "#fff")
            .style("padding", "10px")
            .style("text-align", "center")
            .append("xhtml:textarea")
            .attr("style", "width:100%; height:100%; border:none; outline:none; resize:none; background-color: white;")
            .html(""); // Starts empty
    }

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


