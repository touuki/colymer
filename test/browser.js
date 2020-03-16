$.ajax({
    url: "http://127.0.0.1:3000/api/document/test/123",
    type: "PUT",
    contentType: "application/json",
    data: JSON.stringify({
        html: true,
        time: new Date().getTime(),
        author_name: "Tou Uki",
        author_id: "1",
        title: "test",
        text: "<span>1234</span>",
        metadata: {
            category: "1234",
            url: "http://127.0.0.1",
            labels: [
                "hello",
                "world"
            ]
        },
        attachments: [
            {
                filename: "test.txt",
                encoding: "utf-8",
                content: "slajgjdsgajj"
            }
        ]
    }),
    success: (data, status, err) => {
        console.log("success", data, status, err);
    },
    error: (xhr, status, err) => {
        console.log("error", xhr, status, err);
    },
});