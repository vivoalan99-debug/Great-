import React from 'react';
import { Card } from '../ui/Card';
import { ExpensesTable } from '../ExpensesTable';

export const ExpensesView = () => {
    return (
        <Card title="Detailed Expenses Management" className="min-h-[500px]">
            <ExpensesTable />
        </Card>
    );
};