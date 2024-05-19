export default function generateContourData(value) {
    const size = 50;
    const data = [];
    for (let y = 0; y < size; y++) {
        const row = [];
        for (let x = 0; x < size; x++) {
            row.push(Math.sin(x / size * Math.PI) * Math.cos(y / size * Math.PI) * value);
        }
        data.push(row);
    }
    return data;
}
