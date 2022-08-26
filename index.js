const sqlite3 = require('sqlite3');
const axios = require('axios');
const express = require('express');
const app = express();
const port = 3000;
const SQLite3 = sqlite3.verbose();
const db = new SQLite3.Database('users-info');

//Already set username empty as default
let GITHUB_USERNAME = '';

app.get('/:username', (req, res) => {
    //Setting dynamic username
    GITHUB_USERNAME = req.params.username;

    let since, until = ''
    //Checking existing user logs
    existingLog().then(response => {
        if(response.length > 0){
            response = [...response].shift();
            since =  response.date;
            until = new Date().toISOString();
        }
        //Getting public Gists from GitHub
        requestApi(since,until, 'GET').then(data => {
            if(data.length){
                let fileNames = []
                data.forEach(row => {
                    fileNames.push(Object.values(row.files)[0].filename)
                });
                //sending success response with data
                res.send({data: fileNames, message:'Data successfully retrieved.'});
            }else{
                //sending no record response
                if(since){
                    res.send({data: [], message:`No Data found since ${since} until ${until}`});
                }else{
                    res.send({data: [], message:'No Data found'});
                }

            }

        })
    })


});

//Generic function for API request
const query = (command, method = 'all') => {
    return new Promise((resolve, reject) => {
        db[method](command, (error, result) => {
            if (error) {
                reject(error);
            } else {
                resolve(result);
            }
        });
    });
};



db.serialize(async () => {
    //If database not exist or App deployed first time.
    await query("CREATE TABLE IF NOT EXISTS apiRequestsLog (username text, date text)", 'run');
    //Every request will be Log for every username.
    await createLog();
});

//For creating user log on request
const createLog = async () => {
    await query(`INSERT INTO apiRequestsLog VALUES ("${GITHUB_USERNAME}","${new Date().toISOString()}")`, 'run');
};

//For checking existing user log on request
const existingLog = async () => {
    return await query(`SELECT rowid as id, username, date FROM apiRequestsLog where username="${GITHUB_USERNAME}" ORDER BY id DESC LIMIT 1`);
};


// Create Function to handle requests from the backend
const requestApi = async (SINCE, UNTIL, METHOD) => {

        const options = {
            url: `https://api.github.com/users/${GITHUB_USERNAME}/gists?since=${SINCE}&until=${UNTIL}`,
            method: METHOD,
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json;charset=UTF-8",
            },
        };
        res = await axios(options);
        return res.data;
}


app.listen(port, () => console.log(`App listening on port ${port}!`))

