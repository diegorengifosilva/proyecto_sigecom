import { useEffect, useState } from "react";
import api from "./api";

export default function useTendencias(anno, viewScope = "global") {
  const [data, setData] = useState(null);

  useEffect(() => {
    const isPersonal = viewScope === "personal";
    api.get(`dashboard/tendencias/?anno=${anno}${isPersonal ? "&personal=true" : ""}`)
      .then(res => setData(res.data))
      .catch(console.error);
  }, [anno, viewScope]);

  return data;
}