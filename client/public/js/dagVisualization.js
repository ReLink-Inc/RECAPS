// document.addEventListener('DOMContentLoaded', function() {
//     d3.select('#dagContainer').style('overflow', 'scroll');

//     const svg = d3.select("#dagVisualization");
//     const width = document.getElementById('dagContainer').clientWidth;
//     const height = document.getElementById('dagContainer').clientHeight;

//     const renderDAG = (data, setIndex) => {
//         if (!data || !data.children || data.children.length === 0 || !data.children[setIndex] || !data.children[setIndex].children) {
//             console.error("Invalid or missing data for DAG visualization.");
//             return;
//         }
        
//         const margin = { top: 100, right: 700, bottom: 100, left: 200 };
//         const optimalHeight = height - margin.top - margin.bottom;
//         const optimalWidth = width - margin.right - margin.left;

//         const subQuestions = data.children[setIndex].children.map(sq => ({ 
//             name: sq.name, 
//             fullContent: sq.name 
//         }));
//         const processedData = {
//             name: data.name,
//             children: subQuestions,
//             fullContent: data.name,
//             explanation: data.children[setIndex].explanation,
//             _id: data._id
//         };

//         const root = d3.hierarchy(processedData, d => d.children);
//         const treeLayout = d3.tree().size([optimalHeight, optimalWidth]);
//         treeLayout(root);

//         // svg.selectAll("*").remove();

//         const links = svg.selectAll(".link")
//             .data(root.links())
//             .enter().append("path")
//             .attr("class", "link")
//             .attr("d", d3.linkHorizontal()
//                 .x(d => d.y + margin.left)
//                 .y(d => d.x + margin.top))
//             .attr("fill", "none")
//             .attr("stroke", "#555");

//         const nodes = svg.selectAll(".node")
//             .data(root.descendants())
//             .enter().append("g")
//             .attr("class", "node")
//             .attr("transform", d => `translate(${d.y + margin.left},${d.x + margin.top})`);

//         // this code snippet only append question text
//         nodes.filter(d => d.children).append("text")
//             .attr("dy", d => d.children ?"0.31em":"2em")
//             .attr("x", d => d.children ? -5 : 15)
//             .style("text-anchor", d => d.children ? "end" : "start")
//             // .text(d => d.children ? d.data.name :"0")
//             .text(d => d.data.name);
//             // .call(wrapText, 560); // Apply text wrapping with max width of 100 pixels
            

//         // todo: this code snippet generate a 0 text, need to debug
//         nodes.filter(d => !d.children).append("foreignObject")
//             .attr("width", 600)
//             .attr("height", 50)
//             .attr("y", -25)
//             .style("text-anchor", d => d.children ? "end" : "start")
//             .append("xhtml:div")
//             .style("border", "1px solid black")
//             .style("border-radius", "5px")
//             .style("background", "#fff")
//             .style("padding", "1px")
//             .style("text-align", "center")
//             .html(d => `<span>${d.data.name}</span>`);
        

            
//         // Adding a rectangle around each text element
//         nodes.each(function() {
//             var node = d3.select(this),
//                 text = node.select("text"),
//                 bbox = text.node().getBBox();
//             node.insert("rect", "text")
//                 .attr("x", bbox.x - 5)
//                 .attr("y", bbox.y - 5)
//                 .attr("width", bbox.width + 10)
//                 .attr("height", bbox.height + 10)
//                 .attr("fill", "none")
//                 .attr("stroke", "black")
//                 .attr("stroke-width", 1);
//         });

//         nodes.call(d3.drag()
//             .on("start", function(event, d) {
//                 d3.select(this).raise().attr('stroke', 'black');
//             })
//             .on("drag", function(event, d) {
//                 d.x += event.dy;
//                 d.y += event.dx;
//                 d3.select(this).attr("transform", `translate(${d.y + margin.left},${d.x + margin.top})`);
//                 updateLinks();
//             })
//             .on("end", function(event, d) {
//                 d3.select(this).attr('stroke', null);
//             }));


//     nodes.on("click", async (event, d) => {
//         if (d.depth === 0) { // Checks if the clicked node is the main question
//             try {
//                 const response = await fetch(`/api/question/${d.data._id}`);
//                 if (!response.ok) throw new Error('Failed to fetch question details');
//                 const questionDetails = await response.json();
//                 $('#modalTitle').text('Main Question Details');
//                 let modalBodyHtml = `<p>${questionDetails.questionText}</p>`;
//                 questionDetails.subQuestions.forEach((set, index) => {
//                     // Arrow is now to the left of the set label and removed the colon
//                     modalBodyHtml += `<div class='subquestion-set-header' style='cursor:pointer;'><strong><span class='arrow'>&rarr;</span> Set ${index + 1}</strong></div>`;
//                     // Subquestions and explanations are initially hidden
//                     modalBodyHtml += `<div class='subquestion-set-content' style='display:none;'><ul>`;
//                     set.candidateSubquestions.forEach(subQuestion => {
//                         modalBodyHtml += `<li>${subQuestion}</li>`;
//                     });
//                     modalBodyHtml += `</ul><p>${set.explanation}</p></div>`;
//                 });
//                 $('#modalBody').html(modalBodyHtml);
//                 $('#detailsModal').modal('show');
    
//                 // Toggle visibility of each set's content and change arrow direction
//                 $('.subquestion-set-header').click(function() {
//                     $(this).next('.subquestion-set-content').toggle();
//                     // Change the arrow direction based on visibility
//                     $(this).find('.arrow').html($(this).next('.subquestion-set-content').is(':visible') ? '&darr;' : '&rarr;');
//                 });
//             } catch (error) {
//                 console.error('Error fetching question details:', error);
//             }
//         }
        
        
//         else { // For sub-question nodes
//             $('#modalTitle').text('Sub-question Details');
//             let modalBodyHtml = `<p>${d.data.fullContent}</p>`;
//             if (d.data.explanation) {
//                 modalBodyHtml += `<br/><p><strong>Explanation:</strong> ${d.data.explanation}</p>`;
//             }
//             $('#modalBody').html(modalBodyHtml);
//             $('#detailsModal').modal('show');
//         }
//     });

//         function updateLinks() {
//             svg.selectAll(".link")
//                 .attr("d", d3.linkHorizontal()
//                     .x(d => d.y + margin.left)
//                     .y(d => d.x + margin.top));
//         }
//     };

    
//     $.ajax({
//         url: '/api/questionData',
//         type: 'GET',
//         success: function(response) {
//             if (!response || !response.name || !response.children || response.children.length === 0) {
//                 console.error("Invalid or missing data from API for DAG visualization.");
//                 return;
//             }
//             console.log("Dynamic data fetched successfully:", response);

//             document.addEventListener('setIndexChanged', function(e) {
//                 const newIndex = e.detail.newIndex;
//                 if(newIndex !== undefined && newIndex >= 0 && newIndex < response.children.length) {
//                     renderDAG(response, newIndex);
//                 }
//             });

//             renderDAG(response, 0);
//         },
//         error: function(xhr, status, error) {
//             console.error('Error fetching dynamic data:', error.toString(), 'Status:', status, 'Response:', xhr.responseText);
//         }
//     });

//     // function wrapText(text, width) {
//     //     text.each(function() {
//     //         var text = d3.select(this),
//     //             words = text.text().split(/\s+/).reverse(),
//     //             word,
//     //             line = [],
//     //             lineNumber = 0,
//     //             lineHeight = 1.1, // ems
//     //             x = text.attr("x"),
//     //             y = text.attr("y"),
//     //             dy = parseFloat(text.attr("dy") || 0),
//     //             tspan = text.text(null).append("tspan").attr("x", x).attr("y", y).attr("dy", dy + "em");

//     //         while (word = words.pop()) {
//     //             line.push(word);
//     //             tspan.text(line.join(" "));
//     //             if (tspan.node().getComputedTextLength() > width) {
//     //                 line.pop();
//     //                 tspan.text(line.join(" "));
//     //                 line = [word];
//     //                 tspan = text.append("tspan").attr("x", x).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
//     //             }
//     //         }
//     //     });
//     // }
// });






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
        
        const margin = { top: 100, right: 700, bottom: 100, left: 300 };
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

        // nodes.append("circle")
        //     .attr("r", 10)
        //     .attr("fill", "#555");
        



        // nodes.append("text")
        //     .attr("dy", "0.31em")
        //     .attr("x", d => d.children ? -2 : 2)
        //     .style("text-anchor", d => d.children ? "end" : "start")
        //     .text(d => d.data.name)
        //     .each(function(d) {
        //         var bbox = this.getBBox(); // 获取文本的 bounding box
        //         var padding = 2; // 设置边距

        //         // 在文本之前插入 rect 元素
        //         d3.select(this.parentNode).insert("rect", "text")
        //             .attr("x", bbox.x - padding)
        //             .attr("y", bbox.y - padding)
        //             .attr("width", bbox.width + 2*padding)
        //             .attr("height", bbox.height + 2*padding)
        //             .style("fill", "white")
        //             .style("stroke", "black");
        //     });

        // todo: add wrap function to wrap text




        nodes.filter(d => d.children).append("text")
            .attr("dy", "0.31em")
            .attr("x", d => d.children ? -2 : 2)
            .style("text-anchor", d => d.children ? "end" : "start")
            .text(d => d.data.name)
            .each(function(d) {
                var bbox = this.getBBox(); // 获取文本的 bounding box
                var padding = 2; // 设置边距

                // 在文本之前插入 rect 元素
                d3.select(this.parentNode).insert("rect", "text")
                    .attr("x", bbox.x - padding)
                    .attr("y", bbox.y - padding)
                    .attr("width", bbox.width + 2*padding)
                    .attr("height", bbox.height + 2*padding)
                    .style("fill", "white")
                    .style("stroke", "black");
            });

            
// this code snippet will add subquestions and let links connect to upper left corner of the subquestions
        nodes.filter(d => !d.children).append("foreignObject")
            .attr("width", 500)
            .attr("height", 50)
            .attr("y", -25)  //2 lines = 50?
            .append("xhtml:div")
            .style("border", "1px solid black")
            .style("border-radius", "5px")
            .style("background", "#fff")
            .style("padding", "0px")
            .style("text-align", "center")
            .html(d => `<span>${d.data.name}</span>`);




        // 使用 getBBox() 计算每个文本的尺寸，然后添加矩形框
        // nodes.each(function(d) {
        //     const bbox = this.getBBox();  // 获取文本边界框
        //     d3.select(this).insert("rect", "text")  // 在文本前插入矩形
        //         .attr("x", bbox.x - 2)   // 留出一些边距
        //         .attr("y", bbox.y - 2)
        //         .attr("width", bbox.width + 4)
        //         .attr("height", bbox.height + 4)
        //         .style("fill", "none")
        //         .style("text-align", "center")
        //         .style("stroke", "black");  // 设定边框颜色
        // });


        nodes.on("click", async (event, d) => {
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


