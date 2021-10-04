const express = require("express");
const router = express.Router();

router.get('/', (req, res) => {
    res.send("Patient's List");
})

router.post('/sessionRecord', (req, res) => {
    res.send("patient's record insert");
})

module.exports = router;