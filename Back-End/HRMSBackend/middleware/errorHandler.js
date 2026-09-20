module.exports = (err,req,res,next)=>{
    console.log(err);
    res.status(500).send(`
         <h1>Internal Server Error</h1>
         <p>${err.message}</p>
        `)
}