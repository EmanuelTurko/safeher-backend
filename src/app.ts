import appInit from './server';

const init = async () => {
    const app = await appInit();
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Listening on port ${PORT}`);
    });
}

init().then(() => console.log("Server started")).catch((err:any) => console.log("error:", err));