# 🌟 Decentralized Investment Club (DIC)

Welcome to the Decentralized Investment Club – a blockchain-powered platform that enables groups of individuals to collaboratively pool funds, make investment decisions, and manage returns with full transparency and trustlessness! Built on the Stacks blockchain using Clarity smart contracts, this project solves real-world problems in traditional investment clubs, such as lack of transparency, high intermediary fees, trust issues among members, and inefficient decision-making. By leveraging blockchain, members can securely contribute funds, vote on investments (e.g., in crypto assets or tokenized real-world assets like stocks or real estate), and automatically distribute profits – all without needing a central authority.

## ✨ Features

🔗 Pool funds securely from multiple members  
🗳️ Democratic voting on investment proposals  
💰 Automated treasury management and investment execution  
📊 Transparent tracking of club performance and member shares  
🔄 Easy entry/exit for members with fair share calculations  
📈 Support for diverse investments (e.g., DeFi integrations or external asset tokens)  
🚨 Governance rules to update club parameters (e.g., minimum contributions or voting thresholds)  
🛡️ Built-in dispute resolution and audit logs for accountability  
✅ Involves 8 interconnected Clarity smart contracts for modular, secure operations

## 🛠 How It Works

This project uses 8 smart contracts written in Clarity to handle different aspects of the investment club. They interact seamlessly to ensure security and efficiency. Here's a breakdown:

1. **MembershipContract**: Manages club membership. Members join by committing a minimum STX (Stacks token) amount, and their shares are tracked as NFTs or fungible tokens representing ownership percentages.

2. **TreasuryContract**: Acts as the club's vault. Handles fund pooling, deposits, and withdrawals. Ensures funds are locked until approved investments or distributions occur.

3. **ProposalContract**: Allows members to submit investment proposals, including details like target asset, amount to invest, and expected returns. Proposals are timestamped and immutable.

4. **VotingContract**: Enables weighted voting based on member shares. Uses a quorum system to approve or reject proposals, with time-bound voting periods to prevent delays.

5. **InvestmentContract**: Executes approved proposals by interacting with external protocols (e.g., swapping STX for other tokens via DeFi bridges on Stacks). Tracks investment outcomes.

6. **DistributionContract**: Calculates and distributes profits or losses proportionally. Members can claim their shares periodically or upon exit.

7. **GovernanceContract**: Allows voted changes to club rules, such as adjusting fees, voting thresholds, or integrating new investment types. Ensures the club evolves democratically.

8. **AuditContract**: Logs all transactions, votes, and changes for transparency. Anyone can query historical data to verify operations, reducing disputes.

**For New Members**

- Call the `join-club` function in MembershipContract with your STX contribution.
- Receive a membership token that represents your proportional ownership.
- Start participating in votes and proposals immediately!

**For Proposal Creators**

- Use ProposalContract's `submit-proposal` with details like investment target (e.g., a token address) and rationale.
- Members vote via VotingContract – if approved, InvestmentContract handles the execution automatically.

**For Fund Managers/Verifiers**

- Query TreasuryContract for current balances and AuditContract for logs.
- Use DistributionContract to claim returns or exit the club with your fair share.

That's it! Your investment club runs autonomously on the blockchain, minimizing risks and maximizing collaboration. Deploy these contracts on Stacks for a truly decentralized experience.