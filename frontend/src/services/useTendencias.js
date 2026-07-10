import { useEffect, useState } from "react";
import api from "./api";

export default function useTendencias(anno) {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get(`dashboard/tendencias/?anno=${anno}`)
      .then(res => setData(res.data))
      .catch(console.error);
  }, [anno]);

  return data;
}