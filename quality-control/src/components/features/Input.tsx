import { useState } from 'react';


export const Input = () => {

    const [count, setCount] = useState(1);
  return (
    <div>  

        <button onClick={() => setCount(count + 1)}>

            Increment 
        </button>
         <button onClick={() => setCount(count - 1)}>

            Decrement 
        </button>
    </div>
  )
}



