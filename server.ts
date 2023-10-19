import express from 'express';
import cors from "cors";
import { relayTransaction } from './relayer';

const app = express();

app.use(cors());

app.post('/api/relay-transaction', async (req, res) =>{
      try {
        const taskData = await relayTransaction();
        return res.status(200).json({ ...taskData });
      } catch (error) {
        throw error;
      }

})

app.listen(5001, () => console.log('App listening on port 5001!'));