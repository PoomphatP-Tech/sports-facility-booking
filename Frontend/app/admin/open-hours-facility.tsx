import { Button, Form } from "react-bootstrap";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export type Opening = {
    day: string;
    startTime: Date;
    endTime: Date;
};

type Props = {
    openings: Opening[];
    onChange: (openings: Opening[]) => void;
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const makeTime = (hour: number, minute = 0, second = 0, ms = 0): Date => {
    const date = new Date();
    date.setHours(hour, minute, second, ms);
    return date;
};

export default function OpeningHoursFacility({ openings, onChange }: Props) {
    const addOpening = () => {
        onChange([...openings, { day: "Mon", startTime: makeTime(9), endTime: makeTime(17) }]);
    };

    const removeOpening = (index: number) => {
        onChange(openings.filter((_, i) => i !== index));
    };

    const updateOpening = (index: number, field: keyof Opening, value: string | Date) => {
        onChange(openings.map((o, i) => i === index ? { ...o, [field]: value } : o));
    };

    return (
        <section className="create-facility-section">
            <div className="create-facility-section-header">
                <h2>Opening Hours</h2>
                <Button type="button" variant="outline-primary" size="sm" onClick={addOpening}>
                    + Add Day
                </Button>
            </div>

            {openings.map((opening, index) => (
                <div key={index} className="create-facility-opening-row">
                    <Form.Select
                        className="create-facility-opening-day"
                        value={opening.day}
                        onChange={(e) => updateOpening(index, "day", e.target.value)}
                    >
                        {DAYS.map((day) => (
                            <option key={day} value={day}>{day}</option>
                        ))}
                    </Form.Select>

                    <DatePicker
                        selected={opening.startTime}
                        onChange={(date: Date | null) => date && updateOpening(index, "startTime", date)}
                        showTimeSelect
                        showTimeSelectOnly
                        timeIntervals={30}
                        timeFormat="HH:mm"
                        dateFormat="HH:mm"
                        className="form-control create-facility-time-picker"
                    />

                    <span>to</span>

                    <DatePicker
                        selected={opening.endTime}
                        onChange={(date: Date | null) => date && updateOpening(index, "endTime", date)}
                        showTimeSelect
                        showTimeSelectOnly
                        timeIntervals={30}
                        timeFormat="HH:mm"
                        dateFormat="HH:mm"
                        className="form-control create-facility-time-picker"
                    />

                    {openings.length > 1 && (
                        <Button type="button" variant="outline-danger" size="sm" onClick={() => removeOpening(index)}>
                            Remove
                        </Button>
                    )}
                </div>
            ))}
        </section>
    );
}