/**
 * Paper Generation and Attempt Interactivity Scripts
 */

document.addEventListener('DOMContentLoaded', () => {
    
    // =========================================================================
    // 1. Live Adaptive Allocation Preview in Generate Paper Form
    // =========================================================================
    const generateForm = document.getElementById('generatePaperForm');
    const previewContainer = document.getElementById('adaptivePreviewContainer');
    
    if (generateForm && previewContainer) {
        const chapterCheckboxes = generateForm.querySelectorAll('input[name="chapter_ids"]');
        const marksInput = document.getElementById('total_marks');
        
        async function updateLivePreview() {
            const selectedChapters = Array.from(chapterCheckboxes)
                .filter(cb => cb.checked)
                .map(cb => parseInt(cb.value));
                
            const totalMarks = parseInt(marksInput ? marksInput.value : 30) || 30;
            
            if (selectedChapters.length === 0) {
                previewContainer.innerHTML = `
                    <div class="text-muted small text-center py-4">
                        <i class="bi bi-info-circle me-1 text-primary"></i> Select one or more chapters to preview adaptive marks distribution.
                    </div>`;
                return;
            }
            
            try {
                const response = await fetch('/api/preview-adaptive-allocation', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chapter_ids: selectedChapters,
                        total_marks: totalMarks
                    })
                });
                
                const data = await response.json();
                if (data.success) {
                    let html = `<div class="table-responsive"><table class="table table-sm table-borderless align-middle mb-2">
                        <thead class="text-muted small">
                            <tr>
                                <th>Chapter</th>
                                <th>Status</th>
                                <th class="text-center">Weight</th>
                                <th class="text-end">Allocation</th>
                            </tr>
                        </thead>
                        <tbody>`;
                    
                    data.allocations.forEach(item => {
                        let badgeClass = 'badge-unattempted';
                        if (item.status === 'Weak') badgeClass = 'badge-weak';
                        else if (item.status === 'Average') badgeClass = 'badge-average';
                        else if (item.status === 'Strong') badgeClass = 'badge-strong';
                        
                        html += `
                            <tr>
                                <td class="fw-bold text-dark small">${item.chapter_name}</td>
                                <td><span class="badge-status ${badgeClass}" style="font-size: 0.72rem;">${item.status}</span></td>
                                <td class="text-center text-muted small">${item.multiplier}x</td>
                                <td class="text-end fw-bold text-primary">${item.allocated_marks} M <span class="text-muted fw-normal small">(${item.percentage}%)</span></td>
                            </tr>
                        `;
                    });
                    
                    html += `</tbody></table></div>`;
                    
                    if (data.explanations && data.explanations.length > 0) {
                        html += `<div class="p-2.5 rounded-3 small mt-2" style="background: #f8fafc; border: 1px solid #e2e8f0;">
                            <div class="fw-bold text-secondary mb-1"><i class="bi bi-cpu text-primary me-1"></i> Smart Allocation Breakdown:</div>
                            <ul class="mb-0 ps-3 text-muted">`;
                        data.explanations.forEach(exp => {
                            const cleanExp = exp.replace(/\*\*/g, '');
                            html += `<li>${cleanExp}</li>`;
                        });
                        html += `</ul></div>`;
                    }
                    
                    previewContainer.innerHTML = html;
                }
            } catch (err) {
                console.error('Error fetching preview:', err);
            }
        }
        
        chapterCheckboxes.forEach(cb => cb.addEventListener('change', updateLivePreview));
        if (marksInput) marksInput.addEventListener('input', updateLivePreview);
        
        updateLivePreview();
    }

    // =========================================================================
    // 2. Real-time Marks Calculation & Validation in Attempt Form
    // =========================================================================
    const attemptForm = document.getElementById('attemptPaperForm');
    if (attemptForm) {
        const markInputs = attemptForm.querySelectorAll('.mark-input');
        const scoreCounter = document.getElementById('liveTotalScore');
        const pctDisplay = document.getElementById('livePercentageDisplay');
        const answeredCountEl = document.getElementById('answeredCount');
        const progressEl = document.getElementById('answeredProgress');
        const totalMarksMax = parseFloat(scoreCounter ? scoreCounter.dataset.maxMarks : 0) || 0;
        const totalQuestions = markInputs.length;
        
        function calculateTotalMarks() {
            let currentTotal = 0.0;
            let answeredCount = 0;
            
            markInputs.forEach(input => {
                const max = parseFloat(input.dataset.maxMark) || 0;
                const val = parseFloat(input.value);
                
                if (!isNaN(val)) {
                    if (val < 0 || val > max) {
                        input.classList.add('is-invalid');
                    } else {
                        input.classList.remove('is-invalid');
                        currentTotal += val;
                    }
                }
                
                // Count as answered if student changed from 0 or entered answer
                const qCard = input.closest('.question-attempt-card');
                const answerText = qCard ? qCard.querySelector('.student-answer-input')?.value.trim() : '';
                if (val > 0 || (answerText && answerText.length > 0)) {
                    answeredCount++;
                }
            });
            
            if (scoreCounter) {
                scoreCounter.textContent = currentTotal.toFixed(1).replace('.0', '');
            }

            if (pctDisplay && totalMarksMax > 0) {
                const pct = Math.round((currentTotal / totalMarksMax) * 100);
                pctDisplay.textContent = `${pct}% Achieved`;
            }

            if (answeredCountEl) {
                answeredCountEl.textContent = `${answeredCount} / ${totalQuestions}`;
            }

            if (progressEl && totalQuestions > 0) {
                const progressPct = Math.round((answeredCount / totalQuestions) * 100);
                progressEl.style.width = `${progressPct}%`;
            }
        }
        
        markInputs.forEach(input => {
            input.addEventListener('input', calculateTotalMarks);
        });

        document.querySelectorAll('.student-answer-input').forEach(ta => {
            ta.addEventListener('input', calculateTotalMarks);
        });
        
        // Initial calculation
        calculateTotalMarks();
    }
});
